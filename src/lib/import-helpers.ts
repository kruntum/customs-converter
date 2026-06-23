export function cleanInvoiceNumber(invoiceNo: string | null | undefined): string {
    if (!invoiceNo) return '';
    const str = String(invoiceNo).trim();
    const idx = str.lastIndexOf('#');
    if (idx !== -1) {
        return str.substring(0, idx).trim();
    }
    return str;
}

export function parseInvoiceRevision(rawInvNo: string): { base: string; revision: number } {
    const trimmed = rawInvNo.trim();
    const lastHashIndex = trimmed.lastIndexOf('#');
    if (lastHashIndex === -1) {
        return { base: trimmed, revision: 0 };
    }
    const base = trimmed.substring(0, lastHashIndex).trim();
    const suffix = trimmed.substring(lastHashIndex + 1).trim();
    const revision = parseInt(suffix, 10);
    if (isNaN(revision)) {
        return { base: trimmed, revision: 0 };
    }
    return { base, revision };
}

export function cleanTaxId(taxId: string | number | null | undefined): string {
    if (taxId === null || taxId === undefined) return '';
    // Strip everything except digits, preserving leading zeroes as string
    return String(taxId).replace(/\D/g, '');
}

export interface ExcelRow {
    'reference no'?: string | number;
    'Item'?: string | number;
    'Invoice No'?: string | number;
    'Inv. Item'?: string | number;
    'Decl. No'?: string | number;
    'Status'?: string;
    '3'?: any;
    '4'?: any;
    'Invoice Date'?: string | number | Date;
    'Exporter Name'?: string;
    'Exporter Tax No'?: string | number;
    'Export Branch'?: string | number;
    'Vessel Name'?: string;
    'Voy Number'?: string | number;
    'MBL'?: string | number;
    'HBL'?: string | number;
    'Export Date'?: string | number | Date;
    'Product Code'?: string | number;
    'Brand Name'?: string;
    'Product Description EN'?: string;
    'Product Description TH'?: string;
    'Purchase City'?: string;
    'Tariff'?: string | number;
    'Tariff Code'?: string | number;
    'Tariff Seq.'?: string | number;
    'Statistical Code'?: string | number;
    'Net Weight'?: string | number;
    'Weight Unit'?: string;
    'Package'?: string | number;
    'Package Unit'?: string;
    'Quantity'?: string | number;
    'Qty. Unit'?: string;
    'Currency Code'?: string;
    'Exchange Rate'?: string | number;
    'Price'?: string | number;
    'Price THB'?: string | number;
    'FOB'?: string | number;
    'FOB THB'?: string | number;
    'Remark'?: string;
}

export interface ImportItem {
    goodsName: string;
    netWeight: number | null;
    price: number; // Unit price
    totalPrice: number; // FOB price
    quantity: number;
    itemNo?: number | null;
}

export interface ImportInvoice {
    invoiceNumber: string;
    invoiceDate: string; // YYYY-MM-DD
    items: ImportItem[];
}

export interface ImportTransaction {
    declarationNumber: string;
    declarationDate: string; // YYYY-MM-DD
    currencyCode: string;
    notes: string;
    exporterTaxNo: string;
    exporterName: string;
    invoices: ImportInvoice[];
}

// Convert Excel dates (either strings or Serial Numbers) to YYYY-MM-DD
export function parseExcelDate(dateVal: any): string {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
    }
    // If it's an Excel Date Serial Number (e.g. 45000)
    if (typeof dateVal === 'number' && dateVal > 20000 && dateVal < 60000) {
        // Excel base date is Dec 30, 1899 due to leap year bug
        const date = new Date((dateVal - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    const str = String(dateVal).trim();
    // Try to parse YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    // Fallback parser for DD/MM/YYYY
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
    }
    return str;
}

export function getRowValue(row: any, key: string | undefined): any {
    if (!key) return undefined;
    if (row[key] !== undefined) return row[key];
    
    // Case-insensitive / whitespace-insensitive lookup fallback
    const normalizedKey = key.trim().toLowerCase();
    const rowKeys = Object.keys(row);
    for (const rk of rowKeys) {
        if (rk.trim().toLowerCase() === normalizedKey) {
            return row[rk];
        }
    }
    return undefined;
}

export function groupExcelRows(
    rows: any[], 
    productLang: 'TH' | 'EN', 
    mapping?: Record<string, string> | null
): ImportTransaction[] {
    const transactionsMap = new Map<string, ImportTransaction>();

    // 1. Filter out canceled rows (Status = 'C')
    const activeRows = rows.filter(row => {
        const rawStatus = getRowValue(row, mapping?.status || 'Status');
        const status = String(rawStatus || '').trim().toUpperCase();
        return status !== 'C';
    });

    // 2. Pre-process and filter rows to keep only the highest revision of each base invoice number globally
    const baseInvMap = new Map<string, Array<{ row: any; revision: number }>>();
    
    activeRows.forEach(row => {
        const rawInvNo = String(getRowValue(row, mapping?.invoiceNumber || 'Invoice No') || '').trim();
        if (!rawInvNo) return;
        const { base, revision } = parseInvoiceRevision(rawInvNo);
        
        let list = baseInvMap.get(base);
        if (!list) {
            list = [];
            baseInvMap.set(base, list);
        }
        list.push({ row, revision });
    });

    const filteredRows: any[] = [];
    baseInvMap.forEach((items) => {
        const maxRevision = Math.max(...items.map(it => it.revision));
        items.forEach(it => {
            if (it.revision === maxRevision) {
                filteredRows.push(it.row);
            }
        });
    });

    // 3. Process filtered rows
    let lastDeclNo = '';
    let lastTaxNo = '';
    let lastExpName = '';
    let lastCurrency = 'USD';
    let lastInvNo = '';
    let lastInvDate = '';

    filteredRows.forEach((row) => {
        let declNo = String(getRowValue(row, mapping?.declarationNumber || 'Decl. No') || '').trim();

        // If declaration number is blank, inherit from previous row (forward-fill)
        if (!declNo && lastDeclNo) {
            declNo = lastDeclNo;
        } else if (declNo) {
            lastDeclNo = declNo;
        }

        // Clean invoice number
        let rawInvNo = String(getRowValue(row, mapping?.invoiceNumber || 'Invoice No') || '').trim();
        if (!rawInvNo && lastInvNo && declNo === lastDeclNo) {
            rawInvNo = lastInvNo;
        } else if (rawInvNo) {
            lastInvNo = rawInvNo;
        }
        const cleanedInvNo = cleanInvoiceNumber(rawInvNo) || 'NO_INVOICE';

        // Parse dates
        const declDate = ''; // Customs submission date should start empty; not mapped from Export/Invoice Date in Excel
        const mappedInvDateKey = mapping?.invoiceDate;
        const invDateRaw = mappedInvDateKey 
            ? getRowValue(row, mappedInvDateKey) 
            : (getRowValue(row, 'Invoice Date') || getRowValue(row, 'Export Date'));
        let invDate = parseExcelDate(invDateRaw);
        if (!invDate && lastInvDate && rawInvNo === lastInvNo) {
            invDate = lastInvDate;
        } else if (invDate) {
            lastInvDate = invDate;
        }

        // Exporter details
        let taxNo = cleanTaxId(getRowValue(row, mapping?.exporterTaxNo || 'Exporter Tax No'));
        if (!taxNo && lastTaxNo && declNo === lastDeclNo) {
            taxNo = lastTaxNo;
        } else if (taxNo) {
            lastTaxNo = taxNo;
        }

        let expName = String(getRowValue(row, mapping?.exporterName || 'Exporter Name') || '').trim();
        if (!expName && lastExpName && declNo === lastDeclNo) {
            expName = lastExpName;
        } else if (expName) {
            lastExpName = expName;
        }

        // Currency
        let currency = String(getRowValue(row, mapping?.currencyCode || 'Currency Code') || '').trim().toUpperCase();
        if (!currency && lastCurrency && declNo === lastDeclNo) {
            currency = lastCurrency;
        } else if (currency) {
            lastCurrency = currency;
        } else {
            currency = 'USD';
        }

        // Remark / reference no
        const mappedNotesKey = mapping?.notes;
        const notesRaw = mappedNotesKey
            ? getRowValue(row, mappedNotesKey)
            : (getRowValue(row, 'Remark') || getRowValue(row, 'reference no'));
        const notes = String(notesRaw || '').trim();

        // Mapped goodsName
        const descEN = String(getRowValue(row, mapping?.goodsNameEN || 'Product Description EN') || '').trim();
        const descTH = String(getRowValue(row, mapping?.goodsNameTH || 'Product Description TH') || '').trim();
        
        let goodsName = '';
        if (productLang === 'EN') {
            goodsName = descEN || descTH || 'Unknown Product';
        } else {
            goodsName = descTH || descEN || 'สินค้าไม่ระบุชื่อ';
        }

        // Weight
        const netWeightRaw = getRowValue(row, mapping?.netWeight || 'Net Weight');
        const netWeight = netWeightRaw ? parseFloat(String(netWeightRaw)) : null;

        // Quantity
        const quantityRaw = getRowValue(row, mapping?.quantity || 'Quantity');
        const quantity = quantityRaw ? parseFloat(String(quantityRaw)) : 0;

        // Pricing: Total price is FOB, Unit price is Price
        const totalFobRaw = getRowValue(row, mapping?.totalPrice || 'FOB');
        const totalFob = totalFobRaw ? parseFloat(String(totalFobRaw)) : 0;
        const unitPriceRaw = getRowValue(row, mapping?.price || 'Price');
        const unitPriceVal = unitPriceRaw ? parseFloat(String(unitPriceRaw)) : 0;

        let finalUnitPrice = unitPriceVal;
        let finalTotalPrice = totalFob;

        if (finalTotalPrice === 0 && finalUnitPrice > 0) {
            // Fallback total price
            finalTotalPrice = finalUnitPrice * (quantity || 1);
        }

        if (finalUnitPrice === 0 && finalTotalPrice > 0) {
            // Fallback unit price
            finalUnitPrice = quantity > 0 ? (finalTotalPrice / quantity) : finalTotalPrice;
        }

        // Item No
        const itemNoRaw = getRowValue(row, mapping?.itemNo) || getRowValue(row, 'Item') || getRowValue(row, 'Inv. Item');
        const itemNoVal = itemNoRaw ? parseInt(String(itemNoRaw), 10) : null;
        const finalItemNo = (itemNoVal && !isNaN(itemNoVal)) ? itemNoVal : null;

        const importItem: ImportItem = {
            goodsName,
            netWeight: isNaN(netWeight as number) ? null : netWeight,
            price: finalUnitPrice,
            totalPrice: finalTotalPrice,
            quantity: quantity,
            itemNo: finalItemNo
        };

        // Find or create Transaction
        let tx = transactionsMap.get(declNo);
        if (!tx) {
            tx = {
                declarationNumber: declNo,
                declarationDate: declDate,
                currencyCode: currency,
                notes: notes,
                exporterTaxNo: taxNo,
                exporterName: expName,
                invoices: []
            };
            transactionsMap.set(declNo, tx);
        }

        // Find or create Invoice under Transaction
        let inv = tx.invoices.find(i => i.invoiceNumber === cleanedInvNo);
        if (!inv) {
            inv = {
                invoiceNumber: cleanedInvNo,
                invoiceDate: invDate,
                items: []
            };
            tx.invoices.push(inv);
        }

        // Add item
        inv.items.push(importItem);
    });

    return Array.from(transactionsMap.values());
}
