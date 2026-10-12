import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ProductCombobox } from '@/components/product-combobox';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { formatNumber, calculateInvoiceTotals } from '@/lib/utils';

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
  invoiceDate: string;
  items: FormItem[];
  isOpen: boolean;
}

export const emptyItem: FormItem = {
  goodsName: '',
  quantity: '1',
  netWeight: '',
  price: '',
  fobPrice: '',
  freight: '',
  insurance: '',
  totalPrice: ''
};

interface InvoiceCardProps {
  invoice: FormInvoice;
  index: number;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
  type?: string;
  roundingMethod?: string;
  canDelete: boolean;
  onUpdate: (field: keyof FormInvoice, value: string) => void;
  onToggle: () => void;
  onRemove: () => void;
  onAddItem: () => void;
  onRemoveItem: (itemIdx: number) => void;
  onUpdateItem: (itemIdx: number, field: keyof FormItem, value: string) => void;
}

export function InvoiceCard({
  invoice, index, currencyCode, currencySymbol, exchangeRate, type = 'IMPORT', roundingMethod = 'ITEM_ROUNDING',
  canDelete, onUpdate, onToggle, onRemove, onAddItem, onRemoveItem, onUpdateItem,
}: InvoiceCardProps) {
  const calcThb = useCallback((item: FormItem) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseFloat(item.quantity || '1') || 1;
    const fob = item.fobPrice !== undefined && item.fobPrice !== '' ? parseFloat(item.fobPrice) : (parseFloat(item.totalPrice) || (price * qty));
    const freight = item.freight ? parseFloat(item.freight) : 0;
    const ins = item.insurance ? parseFloat(item.insurance) : 0;
    const cif = type === 'IMPORT' ? (fob + freight + ins) : fob;
    return (cif * exchangeRate).toFixed(2);
  }, [exchangeRate, type]);

  const { totalForeign, totalThb } = calculateInvoiceTotals(invoice.items, exchangeRate, roundingMethod, type);

  const isImport = type === 'IMPORT';

  const handlePriceComponentChange = (itemIdx: number, field: 'fobPrice' | 'freight' | 'insurance', val: string) => {
    onUpdateItem(itemIdx, field, val);
    const item = invoice.items[itemIdx];
    const fob = field === 'fobPrice' ? parseFloat(val) || 0 : (item.fobPrice ? parseFloat(item.fobPrice) || 0 : (parseFloat(item.totalPrice) || 0));
    
    if (field === 'fobPrice') {
      onUpdateItem(itemIdx, 'totalPrice', val);
      const qty = parseFloat(item.quantity || '1') || 1;
      if (qty > 0) {
        onUpdateItem(itemIdx, 'price', (fob / qty).toFixed(4));
      }
    }
  };

  return (
    <div className="border rounded-lg bg-card">
      <Collapsible open={invoice.isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              {invoice.isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              อินวอย #{index + 1}
              {invoice.invoiceNumber && (
                <Badge variant="outline" className="text-xs">{invoice.invoiceNumber}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{invoice.items.length} รายการ</span>
              <span>{currencySymbol}{formatNumber(totalForeign, 4)}</span>
              <span className="text-primary font-semibold">฿{formatNumber(totalThb)}</span>
              {canDelete && (
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* Invoice header */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">เลขที่อินวอย *</Label>
                <Input className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50" placeholder="INV-001" value={invoice.invoiceNumber}
                  onChange={(e) => onUpdate('invoiceNumber', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">วันที่อินวอย</Label>
                <DatePicker
                  value={invoice.invoiceDate}
                  onChange={(v) => onUpdate('invoiceDate', v)}
                  className="w-full"
                  inputClassName="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50"
                  buttonClassName="h-7 w-7 bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40"
                />
              </div>
            </div>

            {/* Items table */}
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="py-2 px-1 text-center w-[28px]">#</th>
                    <th className="py-2 px-1.5 text-left min-w-[150px] md:min-w-[180px]">ชื่อสินค้า *</th>
                    <th className="py-2 px-1 text-right w-[65px]">จำนวน</th>
                    {isImport ? (
                      <>
                        <th className="py-2 px-1 text-right w-[85px]">นน. (NW)</th>
                        <th className="py-2 px-1 text-right w-[95px]">ราคา/หน่วย</th>
                        <th className="py-2 px-1 text-right w-[100px]">FOB</th>
                        <th className="py-2 px-1 text-right w-[95px]">ค่าระวาง</th>
                        <th className="py-2 px-1 text-right w-[95px]">ค่าประกัน</th>
                        <th className="py-2 px-1 text-right w-[120px] text-primary font-bold">รวม ({currencyCode}) *</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-1 text-right w-[100px]">น้ำหนัก</th>
                        <th className="py-2 px-1 text-right w-[110px]">ราคา/หน่วย *</th>
                        <th className="py-2 px-1 text-right w-[130px] text-primary font-bold">รวม FOB ({currencyCode}) *</th>
                      </>
                    )}
                    <th className="py-2 px-2 text-right w-[125px]">THB (CIF)</th>
                    <th className="py-2 px-1 w-[32px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-1 px-1 text-center text-muted-foreground text-[11px]">{itemIdx + 1}</td>
                      <td className="py-1 px-1">
                        <ProductCombobox 
                          value={item.goodsName} 
                          onChange={(val) => onUpdateItem(itemIdx, 'goodsName', val)} 
                          className="h-7 text-[11px] bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40" 
                        />
                      </td>
                      <td className="py-1 px-1">
                        <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" placeholder="1" value={item.quantity || ''}
                          onChange={(e) => onUpdateItem(itemIdx, 'quantity', e.target.value)} />
                      </td>
                      {isImport ? (
                        <>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.001" placeholder="0.00" value={item.netWeight || ''}
                              onChange={(e) => onUpdateItem(itemIdx, 'netWeight', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.0001" placeholder="0.00"
                              value={item.price} onChange={(e) => onUpdateItem(itemIdx, 'price', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.fobPrice || ''} onChange={(e) => handlePriceComponentChange(itemIdx, 'fobPrice', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.freight || ''} onChange={(e) => handlePriceComponentChange(itemIdx, 'freight', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.insurance || ''} onChange={(e) => handlePriceComponentChange(itemIdx, 'insurance', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.totalPrice} onChange={(e) => onUpdateItem(itemIdx, 'totalPrice', e.target.value)} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" placeholder="0.00" value={item.netWeight}
                              onChange={(e) => onUpdateItem(itemIdx, 'netWeight', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.price} onChange={(e) => onUpdateItem(itemIdx, 'price', e.target.value)} />
                          </td>
                          <td className="py-1 px-1">
                            <Input className="h-7 text-right text-[11px] px-1.5 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" step="0.01" placeholder="0.00"
                              value={item.totalPrice} onChange={(e) => onUpdateItem(itemIdx, 'totalPrice', e.target.value)} />
                          </td>
                        </>
                      )}
                      <td className="py-1 px-2 text-right text-primary font-semibold text-[11px] whitespace-nowrap">
                        ฿{formatNumber(calcThb(item))}
                      </td>
                      <td className="py-1 px-1">
                        {invoice.items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveItem(itemIdx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="ghost" size="sm" onClick={onAddItem} className="gap-1 w-full border border-dashed text-xs h-7">
              <Plus className="h-3 w-3" /> เพิ่มรายการ
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
