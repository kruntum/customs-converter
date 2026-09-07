import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export interface FormItem {
  goodsName: string;
  quantity?: string;
  netWeight: string;
  price: string;
  fobPrice?: string;
  freight?: string;
  insurance?: string;
  totalPrice: string;
}

export interface FormInvoice {
  invoiceNumber: string;
  invoiceDate: Date | string | null;
  items: FormItem[];
  isOpen?: boolean;
}

export function calculateInvoiceTotals(
  items: FormItem[],
  exchangeRate: number,
  roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string = 'ITEM_ROUNDING',
  type: 'IMPORT' | 'EXPORT' | string = 'IMPORT'
) {
  let totalForeign = 0;
  let totalThb = 0;

  items.forEach((item) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseFloat(item.quantity || '1') || 1;
    const fob = item.fobPrice !== undefined && item.fobPrice !== '' 
      ? parseFloat(item.fobPrice) 
      : (parseFloat(item.totalPrice) || (price * qty));
    const freight = item.freight ? parseFloat(item.freight) : 0;
    const insurance = item.insurance ? parseFloat(item.insurance) : 0;

    const itemBaseForeign = fob;
    const itemCifForeign = type === 'IMPORT' ? (fob + freight + insurance) : fob;

    totalForeign += itemBaseForeign;

    if (roundingMethod === 'ITEM_ROUNDING') {
      totalThb += Math.round(itemCifForeign * exchangeRate * 100) / 100;
    }
  });

  if (roundingMethod === 'TOTAL_ROUNDING') {
    const allCif = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseFloat(item.quantity || '1') || 1;
      const fob = item.fobPrice !== undefined && item.fobPrice !== '' 
        ? parseFloat(item.fobPrice) 
        : (parseFloat(item.totalPrice) || (price * qty));
      const freight = item.freight ? parseFloat(item.freight) : 0;
      const insurance = item.insurance ? parseFloat(item.insurance) : 0;
      return sum + (type === 'IMPORT' ? (fob + freight + insurance) : fob);
    }, 0);
    totalThb = Math.round(allCif * exchangeRate * 100) / 100;
  }

  return { totalForeign, totalThb };
}

export function calculateTransactionTotals(
  invoices: FormInvoice[],
  exchangeRate: number,
  roundingMethod: 'ITEM_ROUNDING' | 'TOTAL_ROUNDING' | string = 'ITEM_ROUNDING',
  type: 'IMPORT' | 'EXPORT' | string = 'IMPORT'
) {
  let grandTotalForeign = 0;
  let grandTotalThb = 0;

  const invoiceTotals = invoices.map((inv) => {
    const { totalForeign, totalThb } = calculateInvoiceTotals(inv.items, exchangeRate, roundingMethod, type);
    grandTotalForeign += totalForeign;
    
    if (roundingMethod === 'ITEM_ROUNDING') {
      grandTotalThb += totalThb;
    }
    
    return { totalForeign, totalThb, itemCount: inv.items.length };
  });

  if (roundingMethod === 'TOTAL_ROUNDING') {
    const allCif = invoices.reduce((sum, inv) => sum + inv.items.reduce((iSum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseFloat(item.quantity || '1') || 1;
      const fob = item.fobPrice !== undefined && item.fobPrice !== '' 
        ? parseFloat(item.fobPrice) 
        : (parseFloat(item.totalPrice) || (price * qty));
      const freight = item.freight ? parseFloat(item.freight) : 0;
      const insurance = item.insurance ? parseFloat(item.insurance) : 0;
      return iSum + (type === 'IMPORT' ? (fob + freight + insurance) : fob);
    }, 0), 0);
    grandTotalThb = Math.round(allCif * exchangeRate * 100) / 100;
  }

  return {
    invoiceTotals,
    grandTotalForeign,
    grandTotalThb,
  };
}

