export interface RawInvoiceItem {
    goodsName: string;
    quantity?: number | null;
    netWeight: number | null;
    price: number;
    fobPrice?: number | null;
    freight?: number | null;
    insurance?: number | null;
    totalPrice: number;
    itemNo?: number | null;
}

export interface RawInvoice {
    invoiceNumber: string;
    invoiceDate: Date;
    items: RawInvoiceItem[];
}

export interface CalculatedItem {
    goodsName: string;
    quantity?: number | null;
    netWeight: number | null;
    price: number;
    priceTHB: number;
    fobPrice?: number | null;
    freight?: number | null;
    insurance?: number | null;
    totalPrice: number;
    totalPriceTHB: number;
    itemNo?: number | null;
}

export interface CalculatedInvoice {
    invoiceNumber: string;
    invoiceDate: Date;
    currencyCode: string;
    totalForeign: number;
    totalThb: number;
    companyId: number;
    createdBy: string;
    items: CalculatedItem[];
}

export interface CalculatedTotals {
    grandTotalForeign: number;
    grandTotalThb: number;
    invoices: CalculatedInvoice[];
}

/**
 * Calculates totals for a transaction with multiple invoices and items
 * based on the specified rounding method.
 */
export function calculateTransactionTotals(params: {
    invoices: RawInvoice[];
    exchangeRate: number;
    currencyCode: string;
    companyId: number;
    userId: string;
    roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string;
    type?: 'IMPORT' | 'EXPORT' | string;
}): CalculatedTotals {
    const { invoices, exchangeRate, currencyCode, companyId, userId, roundingMethod, type = 'IMPORT' } = params;

    let grandTotalForeign = 0;
    let grandTotalThb = 0;

    const calculatedInvoices = invoices.map((inv) => {
        let invForeign = 0;
        let invThb = 0;

        const calculatedItems = inv.items.map((item) => {
            const price = item.price;
            const quantity = item.quantity ?? 1;
            // Base foreign price (FOB / base goods value without freight or insurance)
            const fob = item.fobPrice !== undefined && item.fobPrice !== null && item.fobPrice > 0 
                ? item.fobPrice 
                : (item.totalPrice > 0 ? item.totalPrice : (price * quantity));
            const freight = item.freight ?? 0;
            const insurance = item.insurance ?? 0;

            const itemBaseForeign = fob;
            // For import, CIF = Base Goods + Freight + Insurance for THB customs valuation
            const itemCifForeign = type === 'IMPORT' ? (fob + freight + insurance) : fob;

            const priceTHB = Math.round(price * exchangeRate * 100) / 100;
            const totalPriceTHB = Math.round(itemCifForeign * exchangeRate * 100) / 100;

            invForeign += itemBaseForeign;
            if (roundingMethod === 'ITEM_ROUNDING') {
                invThb += totalPriceTHB;
            }

            return {
                goodsName: item.goodsName,
                quantity,
                netWeight: item.netWeight,
                price,
                priceTHB,
                fobPrice: fob,
                freight,
                insurance,
                totalPrice: itemBaseForeign,
                totalPriceTHB,
                itemNo: item.itemNo,
            };
        });

        if (roundingMethod === 'TOTAL_ROUNDING') {
            const invCifForeign = calculatedItems.reduce((s, it) => s + ((type === 'IMPORT') ? ((it.fobPrice ?? 0) + (it.freight ?? 0) + (it.insurance ?? 0)) : (it.fobPrice ?? 0)), 0);
            invThb = Math.round(invCifForeign * exchangeRate * 100) / 100;
        }

        grandTotalForeign += invForeign;
        if (roundingMethod === 'ITEM_ROUNDING') {
            grandTotalThb += invThb;
        }

        return {
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            currencyCode,
            totalForeign: invForeign,
            totalThb: invThb,
            companyId,
            createdBy: userId,
            items: calculatedItems,
        };
    });

    if (roundingMethod === 'TOTAL_ROUNDING') {
        const allCifForeign = calculatedInvoices.reduce((s, inv) => s + inv.items.reduce((iSum, it) => iSum + ((type === 'IMPORT') ? ((it.fobPrice ?? 0) + (it.freight ?? 0) + (it.insurance ?? 0)) : (it.fobPrice ?? 0)), 0), 0);
        grandTotalThb = Math.round(allCifForeign * exchangeRate * 100) / 100;
    }

    return {
        grandTotalForeign,
        grandTotalThb,
        invoices: calculatedInvoices,
    };
}
