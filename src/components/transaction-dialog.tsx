import { useState, useEffect } from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTransactionStore } from '@/stores/transaction-store';
import { useCustomerStore } from '@/stores/customer-store';
import { InvoiceCard, emptyItem, type FormInvoice, type FormItem } from '@/components/invoice-card';
import { CustomerCombobox } from '@/components/customer-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { formatNumber, calculateTransactionTotals } from '@/lib/utils';
import { useCompanyStore } from '@/stores/company-store';

interface Currency {
  code: string; nameTh: string; nameEn: string; symbol: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  editId?: number | null;
  onSaved: () => void;
}

const today = format(new Date(), 'yyyy-MM-dd');

export function TransactionDialog({ open, onOpenChange, companyId, editId, onSaved }: TransactionDialogProps) {
  const { createTransaction, updateTransaction, fetchTransaction } = useTransactionStore();
  const { rate, loading: rateLoading, fetchRate, clearRate } = useExchangeRate();
  const { fetchCustomers } = useCustomerStore();
  const { companies, fetchCompanies } = useCompanyStore();
  const activeCompany = companies.find((c) => c.id === companyId);
  const roundingMethod = activeCompany?.roundingMethod || 'ITEM_ROUNDING';

  useEffect(() => {
    if (open && companies.length === 0) {
      fetchCompanies();
    }
  }, [open, companies, fetchCompanies]);

  const isEdit = !!editId;

  const [declarationNumber, setDeclarationNumber] = useState('');
  const [type, setType] = useState('IMPORT');
  const [declarationDate, setDeclarationDate] = useState(today);
  const [customerId, setCustomerId] = useState<string>('none');
  const [currencyCode, setCurrencyCode] = useState('CNY');
  const [exchangeRate, setExchangeRate] = useState('');
  const [rateDate, setRateDate] = useState(today);
  const [rateSource, setRateSource] = useState('BOT');
  const [notes, setNotes] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [invoices, setInvoices] = useState<FormInvoice[]>([
    { invoiceNumber: '', invoiceDate: today, items: [{ ...emptyItem }], isOpen: true },
  ]);

  const isTHB = currencyCode === 'THB';
  const rateNum = parseFloat(exchangeRate) || 0;
  const currSymbol = currencies.find(c => c.code === currencyCode)?.symbol || '';

  // Reset form when dialog opens for NEW transaction
  useEffect(() => {
    if (open && !editId) {
      clearRate();
      setDeclarationNumber('');
      setType('IMPORT');
      setDeclarationDate(today);
      setCustomerId('none');
      setCurrencyCode('CNY');
      setExchangeRate('');
      const t1 = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      setRateDate(t1);
      setRateSource('BOT');
      setNotes('');
      setInvoices([{ invoiceNumber: '', invoiceDate: today, items: [{ ...emptyItem }], isOpen: true }]);
    }
  }, [open, editId, clearRate]);

  // Fetch currencies and customers
  useEffect(() => {
    if (open) {
      fetch('/api/currencies', { credentials: 'include' })
        .then(r => r.json())
        .then(j => setCurrencies(j.data || []))
        .catch(console.error);
        
      if (companyId) {
        fetchCustomers(companyId);
      }
    }
  }, [open, companyId, fetchCustomers]);

  // Load existing transaction for edit
  useEffect(() => {
    if (open && editId) {
      setLoadingData(true);
      clearRate();
      fetchTransaction(editId)
        .then((tx) => {
          setDeclarationNumber(tx.declarationNumber);
          setType(tx.type || 'IMPORT');
          setDeclarationDate(tx.declarationDate.split('T')[0]);
          setCustomerId(tx.customerId ? String(tx.customerId) : 'none');
          setCurrencyCode(tx.currencyCode);
          setExchangeRate(tx.exchangeRate);
          setRateDate(tx.rateDate.split('T')[0]);
          setRateSource(tx.rateSource || 'BOT');
          setNotes(tx.notes || '');
          if (tx.invoices && tx.invoices.length > 0) {
            setInvoices(tx.invoices.map((inv) => ({
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: typeof inv.invoiceDate === 'string' ? inv.invoiceDate.split('T')[0] : today,
              isOpen: true,
              items: inv.items.map((item) => ({
                goodsName: item.goodsName,
                netWeight: item.netWeight || '',
                price: item.price,
                totalPrice: item.totalPrice,
              })),
            })));
          }
        })
        .catch((err) => toast.error(err.message))
        .finally(() => setLoadingData(false));
    }
  }, [open, editId, fetchTransaction, clearRate]);

  // Auto-fetch exchange rate ONLY on new transaction creation
  useEffect(() => {
    if (open && !isEdit && currencyCode && declarationDate && !isTHB) {
      fetchRate(currencyCode, declarationDate);
    }
    if (isTHB) {
      setExchangeRate('1');
      setRateSource('THB');
    }
  }, [open, isEdit, currencyCode, declarationDate, isTHB, fetchRate]);

  // Apply fetched rate from fetchRate action
  useEffect(() => {
    if (rate && !isTHB && rate.buyingTransfer) {
      setExchangeRate(type === 'IMPORT' ? (rate.selling || rate.buyingTransfer) : rate.buyingTransfer);
      setRateSource(rate.source || 'BOT');
      if (rate.period) {
        setRateDate(rate.period);
      }
    }
  }, [rate, isTHB, type]);

  const handleDeclarationDateChange = (val: string) => {
    setDeclarationDate(val);
  };

  const handleCurrencyChange = (val: string) => {
    setCurrencyCode(val);
  };

  const handleRateDateChange = (val: string) => {
    setRateDate(val);
    if (currencyCode && !isTHB && val) {
      fetchRate(currencyCode, val);
    }
  };

  // Invoice helpers
  const addInvoice = () => {
    setInvoices([...invoices, { invoiceNumber: '', invoiceDate: today, items: [{ ...emptyItem }], isOpen: true }]);
  };

  const removeInvoice = (idx: number) => {
    if (invoices.length <= 1) return;
    setInvoices(invoices.filter((_, i) => i !== idx));
  };

  const updateInvoice = (idx: number, field: keyof FormInvoice, value: string) => {
    const updated = [...invoices];
    if (field === 'invoiceNumber' || field === 'invoiceDate') {
      updated[idx][field] = value;
    }
    setInvoices(updated);
  };

  const toggleInvoice = (idx: number) => {
    const updated = [...invoices];
    updated[idx].isOpen = !updated[idx].isOpen;
    setInvoices(updated);
  };

  const addItem = (invIdx: number) => {
    const updated = [...invoices];
    updated[invIdx].items.push({ ...emptyItem });
    setInvoices(updated);
  };

  const removeItem = (invIdx: number, itemIdx: number) => {
    if (invoices[invIdx].items.length <= 1) return;
    const updated = [...invoices];
    updated[invIdx].items = updated[invIdx].items.filter((_, i) => i !== itemIdx);
    setInvoices(updated);
  };

  const updateItem = (invIdx: number, itemIdx: number, field: keyof FormItem, value: string) => {
    const updated = [...invoices];
    updated[invIdx].items[itemIdx][field] = value;
    if (field === 'price') updated[invIdx].items[itemIdx].totalPrice = value;
    setInvoices(updated);
  };

  // Totals
  const { grandTotalForeign, grandTotalThb } = calculateTransactionTotals(
    invoices,
    rateNum,
    roundingMethod,
    type
  );

  // Submit
  const handleSave = async () => {
    if (!declarationNumber.trim()) { toast.error('กรุณากรอกเลขที่ใบขน'); return; }
    if (!exchangeRate) { toast.error('กรุณาระบุอัตราแลกเปลี่ยน'); return; }
    for (let i = 0; i < invoices.length; i++) {
      if (!invoices[i].invoiceNumber.trim()) { toast.error(`กรุณากรอกเลขที่อินวอย #${i + 1}`); return; }
      for (let j = 0; j < invoices[i].items.length; j++) {
        if (!invoices[i].items[j].goodsName.trim() || !invoices[i].items[j].price) {
          toast.error(`กรุณากรอกข้อมูลรายการ #${j + 1} ของอินวอย #${i + 1}`); return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        type,
        declarationNumber, declarationDate, currencyCode, exchangeRate, rateDate, rateSource,
        companyId, notes,
        customerId: customerId !== 'none' ? parseInt(customerId) : undefined,
        invoices: invoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate,
          items: inv.items.map(item => ({
            goodsName: item.goodsName,
            quantity: item.quantity ? parseFloat(item.quantity) : 1,
            netWeight: item.netWeight || undefined,
            price: item.price,
            fobPrice: item.fobPrice ? parseFloat(item.fobPrice) : undefined,
            freight: item.freight ? parseFloat(item.freight) : undefined,
            insurance: item.insurance ? parseFloat(item.insurance) : undefined,
            totalPrice: item.totalPrice || item.price,
          })),
        })),
      };

      if (isEdit) {
        await updateTransaction(editId!, payload);
        toast.success('บันทึกการแก้ไขสำเร็จ');
      } else {
        await createTransaction(payload);
        toast.success('สร้างรายการใหม่สำเร็จ');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEdit ? 'แก้ไขรายการ' : 'สร้างรายการใหม่'}
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลใบขนสินค้า อินวอย และรายการสินค้า
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Scrollable content container MUST have a defined height */}
            <ScrollArea className="h-[calc(90vh-135px)] w-full">
              <div className="space-y-3 px-4 py-3">
                {/* Transaction Header */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">ประเภทใบขน *</Label>
                      <Select value={type} onValueChange={(val) => setType(val)}>
                        <SelectTrigger className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus:ring-warning/50">
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMPORT">ขาเข้า (Import)</SelectItem>
                          <SelectItem value="EXPORT">ขาออก (Export)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  <div>
                    <Label className="text-xs">เลขที่ใบขนสินค้า *</Label>
                    <Input className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50" placeholder="DEC-2026-001" value={declarationNumber}
                      onChange={(e) => setDeclarationNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">วันที่ใบขนสินค้า *</Label>
                    <DatePicker 
                      value={declarationDate} 
                      onChange={handleDeclarationDateChange} 
                      className="w-full"
                      inputClassName="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50" 
                      buttonClassName="h-7 w-7 bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs">ลูกค้า (ผู้ส่งออก)</Label>
                    <CustomerCombobox
                      companyId={companyId}
                      value={customerId}
                      onChange={setCustomerId}
                      className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">สกุลเงิน *</Label>
                    <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus:ring-warning/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.nameTh}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isTHB ? (
                    <>
                      <div>
                        <Label className="text-xs">
                          อัตราแลกเปลี่ยน * {rateLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                        </Label>
                        <div className="flex gap-1">
                          <Input className="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50" type="number" step="0.000001" value={exchangeRate}
                            onChange={(e) => { setExchangeRate(e.target.value); setRateSource('MANUAL'); }} />
                          <Badge 
                            variant={rateSource === 'LOCAL_DB' ? 'outline' : rateSource === 'BOT' ? 'secondary' : 'default'} 
                            className={`shrink-0 self-center text-xs px-2 h-7 font-sans ${
                              rateSource === 'LOCAL_DB' 
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                : ''
                            }`}
                          >
                            {rateSource === 'LOCAL_DB' ? 'LOCAL_DB' : rateSource}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">วันที่อัตราแลกเปลี่ยน</Label>
                        <DatePicker 
                          value={rateDate} 
                          onChange={handleRateDateChange} 
                          className="w-full"
                          inputClassName="h-7 text-xs bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50" 
                          buttonClassName="h-7 w-7 bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40" 
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex items-end">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2 w-full">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          💱 สกุลเงินบาท — อัตราแลกเปลี่ยน 1.0
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {rateNum > 0 && !isTHB && (
                  <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-1.5">
                    <p className="text-xs">
                      📌 อัตราแลกเปลี่ยนนี้ใช้กับ<strong>ทุกอินวอย</strong>: 1 {currencyCode} = {formatNumber(exchangeRate, 6)} THB
                    </p>
                  </div>
                )}
              </div>

              {/* Invoices */}
              <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    อินวอย <Badge variant="secondary" className="text-xs">{invoices.length}</Badge>
                  </div>

                {invoices.map((inv, idx) => (
                  <InvoiceCard
                    key={idx}
                    invoice={inv}
                    index={idx}
                    currencyCode={currencyCode}
                    currencySymbol={currSymbol}
                    exchangeRate={rateNum}
                    type={type}
                    roundingMethod={roundingMethod}
                    canDelete={invoices.length > 1}
                    onUpdate={(field, value) => updateInvoice(idx, field, value)}
                    onToggle={() => toggleInvoice(idx)}
                    onRemove={() => removeInvoice(idx)}
                    onAddItem={() => addItem(idx)}
                    onRemoveItem={(itemIdx) => removeItem(idx, itemIdx)}
                    onUpdateItem={(itemIdx, field, value) => updateItem(idx, itemIdx, field, value)}
                  />
                ))}

                <Button variant="ghost" onClick={addInvoice} className="gap-1 w-full border border-dashed border-primary/30 text-primary text-xs h-8">
                  <Plus className="h-3.5 w-3.5" /> เพิ่มอินวอย
                </Button>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs">หมายเหตุ</Label>
                <Input className="h-7 text-xs" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" value={notes}
                  onChange={(e) => setNotes(e.target.value)} />
              </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 border-t bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground text-xs">{invoices.length} อินวอย</span>
                <span className="text-primary text-sm font-semibold">
                  {currSymbol}{formatNumber(grandTotalForeign, 4)} {currencyCode}
                </span>
                <span className="text-primary text-base font-semibold">
                  ฿{formatNumber(grandTotalThb)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isEdit ? 'บันทึก' : 'สร้างรายการ'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
