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

export function parseSafeFloat(val: any, defaultVal = 0): number {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const cleanStr = String(val).replace(/,/g, '').trim();
    if (cleanStr === '' || cleanStr === '-') return defaultVal;
    const num = parseFloat(cleanStr);
    return isNaN(num) ? defaultVal : num;
}

export const FIELD_ALIASES: Record<string, string[]> = {
    declarationNumber: [
        'declarationnumber', 'declarationno', 'declno', 'decl no', 'declaration no',
        'เลขที่ใบขน', 'เลขที่ใบขนสินค้า', 'ใบขน', 'ใบขนสินค้า', 'customsno', 'customsdeclarationno'
    ],
    invoiceNumber: [
        'invoicenumber', 'invoiceno', 'invno', 'inv no', 'invoice no',
        'เลขที่อินวอย', 'เลขที่ใบกำกับ', 'เลขที่ใบกำกับสินค้า', 'invoice'
    ],
    invoiceDate: [
        'invoicedate', 'invdate', 'invoice date', 'inv date', 'export date',
        'วันที่อินวอย', 'วันที่ใบกำกับ', 'วันที่ใบกำกับสินค้า', 'invoiced'
    ],
    exporterTaxNo: [
        'exportertaxno', 'exportertaxid', 'taxid', 'taxno', 'importertaxno', 'importertaxid', 'consigneetaxno',
        'exporter tax no', 'exporter tax id', 'importer tax no', 'importer tax id', 'consignee tax no',
        'เลขผู้เสียภาษี', 'เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษีผู้ส่งออก', 'เลขผู้เสียภาษีผู้นำเข้า',
        'เลขประจำตัวผู้เสียภาษีอากร', 'เลขประจำตัวผู้เสียภาษีอากรผู้ส่งออก', 'เลขประจำตัวผู้เสียภาษีอากรผู้นำเข้า',
        'tax id', 'tax no', 'exportertax', 'importertax', 'tax'
    ],
    exporterName: [
        'exportername', 'exporter', 'importername', 'importer', 'consignee', 'exporter name', 'importer name',
        'ผู้ส่งออก', 'ผู้นำเข้า', 'ชื่อผู้ส่งออก', 'ชื่อผู้นำเข้า', 'companyname', 'company'
    ],
    currencyCode: [
        'currencycode', 'currency', 'cur', 'currency code', 'สกุลเงิน', 'รหัสสกุลเงิน', 'ccy'
    ],
    goodsNameTH: [
        'goodsnameth', 'goodsnamethai', 'goodsname_th', 'product description th', 'description th',
        'ชื่อสินค้า', 'ชื่อสินค้าไทย', 'ชื่อสินค้าภาษาไทย', 'รายการสินค้า', 'สินค้า'
    ],
    goodsNameEN: [
        'goodsnameen', 'goodsnameeng', 'goodsname_en', 'product description en', 'description en',
        'goodsname', 'description', 'goodsdescription', 'ชื่อสินค้าภาษาอังกฤษ'
    ],
    netWeight: [
        'netweight', 'weight', 'net weight', 'น้ำหนัก', 'น้ำหนักสุทธิ', 'netwt', 'gw', 'nw'
    ],
    quantity: [
        'quantity', 'qty', 'จำนวน', 'จำนวนสินค้า'
    ],
    price: [
        'price', 'unitprice', 'unit price', 'ราคาต่อหน่วย', 'ราคา', 'fobunit', 'unitpricefob', 'cifunit', 'unitpricecif', 'ราคาcifต่อหน่วย'
    ],
    fobPrice: [
        'fob', 'fobprice', 'totalfob', 'fob price', 'มูลค่าfob', 'ราคาสินค้า', 'มูลค่าสินค้า', 'invoicevalue', 'invoice value', 'invoicetotal', 'amount', 'total amount', 'amt', 'fcy amount', 'fcy', 'amount fcy', 'amount foreign'
    ],
    freight: [
        'freight', 'freightamount', 'freight amount', 'fright', 'frightamount', 'fright amount', 'frightthb', 'freightthb', 'frightfcy', 'freightfcy', 'ค่าระวาง', 'ค่าขนส่ง', 'ค่าเฟรท', 'oceanfreight', 'airfreight', 'frt', 'frtamt', 'ค่าระวางเรือ', 'ค่าระวางต่างประเทศ'
    ],
    insurance: [
        'insurance', 'insuranceamount', 'insurance amount', 'ins', 'insamount', 'insurancethb', 'insurancefcy', 'insthb', 'insfcy', 'insuarance', 'insuarance amount', 'insuarance thb', 'insuarancefcy', 'ค่าประกัน', 'ค่าประกันภัย', 'ค่าประกันต่างประเทศ', 'ค่าประกันบาท'
    ],
    totalPrice: [
        'totalprice', 'totalfob', 'totalfobprice', 'total price', 'total cif', 'total amount', 'amount', 'amt', 'amount fcy', 'fcy amount', 'fob', 'fobthb', 'cif', 'cifthb', 'totalcif', 'totalcifprice',
        'ราคารวม', 'ราคารวมสินค้า', 'ราคารวมfob', 'ราคารวมcif', 'ยอดรวม', 'ยอดรวมcif', 'cifprice', 'ราคาสินค้า', 'มูลค่าสินค้า'
    ],
    itemNo: [
        'itemno', 'itemnumber', 'item no', 'item number', 'item', 'inv item', 'inv. item', 'ลำดับ', 'ลำดับรายการ', 'ลำดับสินค้า', 'ลำดับที่'
    ],
    status: [
        'status', 'สถานะ', 'สถานะรายการ'
    ],
    notes: [
        'notes', 'remark', 'remarks', 'note', 'reference no', 'referenceno', 'หมายเหตุ', 'อ้างอิง'
    ],
    term: [
        'term', 'terms', 'incoterm', 'incoterms', 'deliveryterm', 'delivery term', 'termofdelivery', 'termofpayment', 'paymentterm', 'payment terms', 'เงื่อนไข', 'เทอม', 'เทอมการค้า', 'เงื่อนไขการส่งมอบ'
    ],
};

export interface ImportItem {
    goodsName: string;
    quantity: number;
    netWeight: number | null;
    price: number; // Unit price FOB (or CIF unit)
    fobPrice?: number;
    freight?: number;
    insurance?: number;
    totalPrice: number; // Total CIF for import, FOB for export
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
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
    const rowKeys = Object.keys(row);
    for (const rk of rowKeys) {
        if (rk.trim().toLowerCase().replace(/[^a-z0-9ก-๙]/g, '') === normalizedKey) {
            return row[rk];
        }
    }
    return undefined;
}

export function findRowValue(row: any, fieldKey: string, mappedField?: string): any {
    if (mappedField) {
        const val = getRowValue(row, mappedField);
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }
    const aliases = FIELD_ALIASES[fieldKey] || [fieldKey];
    for (const alias of aliases) {
        const val = getRowValue(row, alias);
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }
    return undefined;
}

export function extractRowTaxId(row: any, mappedField?: string): string {
    const raw = findRowValue(row, 'exporterTaxNo', mappedField);
    return raw !== undefined && raw !== null ? String(raw).trim() : '';
}

export function groupExcelRows(
    rows: any[], 
    productLang: 'TH' | 'EN', 
    mapping?: Record<string, string> | null
): ImportTransaction[] {
    const transactionsMap = new Map<string, ImportTransaction>();

    // 1. Filter out canceled rows (Status = 'C')
    const activeRows = rows.filter(row => {
        const rawStatus = findRowValue(row, 'status', mapping?.status);
        const status = String(rawStatus || '').trim().toUpperCase();
        return status !== 'C';
    });

    // 2. Pre-process and filter rows to keep only the highest revision of each base invoice number globally
    const baseInvMap = new Map<string, Array<{ row: any; revision: number }>>();
    
    activeRows.forEach(row => {
        const rawInvNo = String(findRowValue(row, 'invoiceNumber', mapping?.invoiceNumber) || '').trim();
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
        let declNo = String(findRowValue(row, 'declarationNumber', mapping?.declarationNumber) || '').trim();

        // If declaration number is blank, inherit from previous row (forward-fill)
        if (!declNo && lastDeclNo) {
            declNo = lastDeclNo;
        } else if (declNo) {
            lastDeclNo = declNo;
        }

        // Clean invoice number
        let rawInvNo = String(findRowValue(row, 'invoiceNumber', mapping?.invoiceNumber) || '').trim();
        if (!rawInvNo && lastInvNo && declNo === lastDeclNo) {
            rawInvNo = lastInvNo;
        } else if (rawInvNo) {
            lastInvNo = rawInvNo;
        }
        const cleanedInvNo = cleanInvoiceNumber(rawInvNo) || 'NO_INVOICE';

        // Parse dates
        const declDate = ''; // Customs submission date should start empty
        const invDateRaw = findRowValue(row, 'invoiceDate', mapping?.invoiceDate);
        let invDate = parseExcelDate(invDateRaw);
        if (!invDate && lastInvDate && rawInvNo === lastInvNo) {
            invDate = lastInvDate;
        } else if (invDate) {
            lastInvDate = invDate;
        }

        // Exporter / Importer details
        let taxNo = cleanTaxId(findRowValue(row, 'exporterTaxNo', mapping?.exporterTaxNo));
        if (!taxNo && lastTaxNo && declNo === lastDeclNo) {
            taxNo = lastTaxNo;
        } else if (taxNo) {
            lastTaxNo = taxNo;
        }

        let expName = String(findRowValue(row, 'exporterName', mapping?.exporterName) || '').trim();
        if (!expName && lastExpName && declNo === lastDeclNo) {
            expName = lastExpName;
        } else if (expName) {
            lastExpName = expName;
        }

        // Currency
        let currency = String(findRowValue(row, 'currencyCode', mapping?.currencyCode) || '').trim().toUpperCase();
        if (!currency && lastCurrency && declNo === lastDeclNo) {
            currency = lastCurrency;
        } else if (currency) {
            lastCurrency = currency;
        } else {
            currency = 'USD';
        }

        // Remark / reference no
        const notesRaw = findRowValue(row, 'notes', mapping?.notes);
        const notes = String(notesRaw || '').trim();

        // Mapped goodsName
        const descEN = String(findRowValue(row, 'goodsNameEN', mapping?.goodsNameEN) || '').trim();
        const descTH = String(findRowValue(row, 'goodsNameTH', mapping?.goodsNameTH) || '').trim();
        
        let goodsName = '';
        if (productLang === 'EN') {
            goodsName = descEN || descTH || 'Unknown Product';
        } else {
            goodsName = descTH || descEN || 'สินค้าไม่ระบุชื่อ';
        }

        // Weight
        const netWeightRaw = findRowValue(row, 'netWeight', mapping?.netWeight);
        const netWeight = netWeightRaw !== undefined && netWeightRaw !== null ? parseSafeFloat(netWeightRaw, 0) : null;

        // Quantity
        const quantityRaw = findRowValue(row, 'quantity', mapping?.quantity);
        const quantity = parseSafeFloat(quantityRaw, 1);

        // Pricing: FOB, Freight, Insurance, CNF, CIF
        const unitPriceRaw = findRowValue(row, 'price', mapping?.price);
        const unitPriceVal = parseSafeFloat(unitPriceRaw, 0);

        const fobRaw = findRowValue(row, 'fobPrice', mapping?.fobPrice);
        const fobVal = parseSafeFloat(fobRaw, 0);

        const freightRaw = findRowValue(row, 'freight', mapping?.freight);
        const freightVal = parseSafeFloat(freightRaw, 0);

        const insuranceRaw = findRowValue(row, 'insurance', mapping?.insurance);
        const insuranceVal = parseSafeFloat(insuranceRaw, 0);

        const cnfRaw = getRowValue(row, 'CNF') || getRowValue(row, 'CFR') || getRowValue(row, 'C&F') || getRowValue(row, 'CNF Price');
        const cnfVal = parseSafeFloat(cnfRaw, 0);

        const cifRaw = findRowValue(row, 'totalPrice', mapping?.totalPrice);
        const cifVal = parseSafeFloat(cifRaw, 0);

        let finalFob = fobVal;
        const finalFreight = freightVal;
        const finalInsurance = insuranceVal;
        let finalTotalPrice = 0;

        // Base goods price resolution (FOB / Base Invoice Value / Amount)
        if (fobVal > 0) {
            finalFob = fobVal;
        } else if (cifVal > 0) {
            finalFob = Math.max(0, cifVal - finalFreight - finalInsurance);
        } else if (cnfVal > 0) {
            finalFob = Math.max(0, cnfVal - finalFreight);
        } else if (unitPriceVal > 0 && quantity > 0) {
            finalFob = unitPriceVal * quantity;
        } else if (unitPriceVal > 0 && netWeight && netWeight > 0) {
            finalFob = unitPriceVal * netWeight;
        }

        let finalUnitPrice = unitPriceVal;
        if (finalUnitPrice === 0 && finalFob > 0) {
            if (quantity > 0) {
                finalUnitPrice = finalFob / quantity;
            } else if (netWeight && netWeight > 0) {
                finalUnitPrice = finalFob / netWeight;
            }
        }

        // Base foreign total price without freight/insurance
        finalTotalPrice = finalFob > 0 ? finalFob : (finalUnitPrice * (quantity || 1));

        // Item No
        const itemNoRaw = findRowValue(row, 'itemNo', mapping?.itemNo);
        const itemNoVal = itemNoRaw ? parseInt(String(itemNoRaw), 10) : null;
        const finalItemNo = (itemNoVal && !isNaN(itemNoVal)) ? itemNoVal : null;

        const importItem: ImportItem = {
            goodsName,
            netWeight: isNaN(netWeight as number) ? null : netWeight,
            price: finalUnitPrice,
            fobPrice: finalFob,
            freight: finalFreight,
            insurance: finalInsurance,
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
