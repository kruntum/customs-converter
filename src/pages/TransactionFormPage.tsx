import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransactionStore } from '@/stores/transaction-store';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PageHeader } from '@/components/page-header';
import { formatNumber, calculateTransactionTotals } from '@/lib/utils';
import { useCompanyStore } from '@/stores/company-store';
import { format } from 'date-fns';
import {
  Plus, Trash2, Loader2, ChevronDown, ChevronRight, FileText, Save, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface FormItem {
  goodsName: string;
  netWeight: string;
  price: string;
  totalPrice: string;
}

interface FormInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  items: FormItem[];
  isOpen: boolean;
}

interface Currency {
  code: string; nameTh: string; nameEn: string; symbol: string;
}

const emptyItem: FormItem = { goodsName: '', netWeight: '', price: '', totalPrice: '' };
const today = format(new Date(), 'yyyy-MM-dd');

export default function TransactionFormPage() {
  const { companyId, transactionId } = useParams();
  const navigate = useNavigate();
  const { createTransaction, updateTransaction, fetchTransaction } = useTransactionStore();
  const { companies, fetchCompanies } = useCompanyStore();
  const activeCompany = companies.find((c) => c.id === parseInt(companyId || '0'));
  const roundingMethod = activeCompany?.roundingMethod || 'ITEM_ROUNDING';

  useEffect(() => {
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [companies, fetchCompanies]);

  const { loading: rateLoading, fetchCustomsRate, fetchDirectRate } = useExchangeRate();
  const isEdit = !!transactionId;

  // Header state
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [declarationDate, setDeclarationDate] = useState(today);
  const [currencyCode, setCurrencyCode] = useState('CNY');
  const [exchangeRate, setExchangeRate] = useState('');
  const [rateDate, setRateDate] = useState(today);
  const [rateSource, setRateSource] = useState('BOT');
  const [notes, setNotes] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<FormInvoice[]>([
    { invoiceNumber: '', invoiceDate: today, items: [{ ...emptyItem }], isOpen: true },
  ]);

  const isTHB = currencyCode === 'THB';

  // Fetch currencies
  useEffect(() => {
    fetch('/api/currencies', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setCurrencies(j.data || []))
      .catch(console.error);
  }, []);

  // Load existing transaction for edit
  useEffect(() => {
    if (isEdit && transactionId) {
      setLoadingData(true);
      fetchTransaction(parseInt(transactionId))
        .then((tx) => {
          setDeclarationNumber(tx.declarationNumber);
          setDeclarationDate(tx.declarationDate.split('T')[0]);
          setCurrencyCode(tx.currencyCode);
          setExchangeRate(tx.exchangeRate);
          setRateDate(tx.rateDate.split('T')[0]);
          setRateSource(tx.rateSource);
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
  }, [isEdit, transactionId, fetchTransaction]);

  // Auto-fetch customs exchange rate ONLY on new transaction creation initial load
  useEffect(() => {
    if (!isEdit && currencyCode && declarationDate && !isTHB) {
      fetchCustomsRate(currencyCode, declarationDate).then(data => {
        if (data && data.buyingTransfer) {
          setExchangeRate(data.buyingTransfer);
          setRateSource(data.source || 'BOT');
          if (data.period) {
            setRateDate(data.period);
          }
        }
      });
    }
    if (isTHB) {
      setExchangeRate('1');
      setRateSource('THB');
    }
  }, [isEdit, currencyCode, isTHB, fetchCustomsRate]);

  const handleDeclarationDateChange = async (val: string) => {
    setDeclarationDate(val);
    if (!val || currencyCode === 'THB') return;
    
    // Automatically calculate and fetch customs rate (T-1 rule) for this declaration date
    const data = await fetchCustomsRate(currencyCode, val);
    if (data && data.buyingTransfer) {
      setExchangeRate(data.buyingTransfer);
      setRateSource(data.source || 'BOT');
      if (data.period) {
        setRateDate(data.period);
      }
    }
  };

  const handleCurrencyChange = async (val: string) => {
    setCurrencyCode(val);
    if (val === 'THB') {
      setExchangeRate('1');
      setRateSource('THB');
      return;
    }
    const targetDate = rateDate || declarationDate;
    if (targetDate) {
      const data = await fetchDirectRate(val, targetDate);
      if (data && data.buyingTransfer) {
        setExchangeRate(data.buyingTransfer);
        setRateSource(data.source || 'BOT');
      }
    }
  };

  const handleRateDateChange = async (val: string) => {
    // 1. ALWAYS retain the user's chosen date in rateDate! NEVER OVERWRITE IT!
    setRateDate(val);
    if (!val || currencyCode === 'THB') return;

    // 2. Fetch the direct exchange rate for THIS EXACT DATE (no T-1 deduction!)
    const data = await fetchDirectRate(currencyCode, val);
    if (data && data.buyingTransfer) {
      setExchangeRate(data.buyingTransfer);
      setRateSource(data.source || 'BOT');
      // NEVER overwrite rateDate! It stays as 'val'!
      if (data.period !== val) {
        toast.info(`อัตราแลกเปลี่ยนอ้างอิงจากวันทำการล่าสุด (${data.period})`, { position: 'top-center' });
      }
    } else {
      toast.warning(`ไม่พบประกาศอัตราแลกเปลี่ยน ธปท. ในวันที่ ${val} (วันหยุด/ไม่มีเรท) คุณสามารถระบุตัวเลขเรทเองได้`, { position: 'top-center' });
      setRateSource('MANUAL');
    }
  };

  // Calculations
  const rateNum = parseFloat(exchangeRate) || 0;
  const currSymbol = currencies.find(c => c.code === currencyCode)?.symbol || '';

  const calcItemThb = useCallback((price: string) => {
    const p = parseFloat(price) || 0;
    return (p * rateNum).toFixed(2);
  }, [rateNum]);

  // Invoice helpers
  const addInvoice = () => {
    setInvoices([...invoices, {
      invoiceNumber: '', invoiceDate: today, items: [{ ...emptyItem }], isOpen: true,
    }]);
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

  // Item helpers
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
    // Auto-set totalPrice = price if not manually changed
    if (field === 'price') {
      updated[invIdx].items[itemIdx].totalPrice = value;
    }
    setInvoices(updated);
  };

  // Calculate totals
  const { invoiceTotals, grandTotalForeign, grandTotalThb } = calculateTransactionTotals(
    invoices,
    rateNum,
    roundingMethod
  );

  // Submit
  const handleSave = async () => {
    if (!declarationNumber.trim()) { toast.error('กรุณากรอกเลขที่ใบขน'); return; }
    if (!exchangeRate) { toast.error('กรุณาระบุอัตราแลกเปลี่ยน'); return; }

    for (let i = 0; i < invoices.length; i++) {
      if (!invoices[i].invoiceNumber.trim()) {
        toast.error(`กรุณากรอกเลขที่อินวอย #${i + 1}`);
        return;
      }
      for (let j = 0; j < invoices[i].items.length; j++) {
        if (!invoices[i].items[j].goodsName.trim() || !invoices[i].items[j].price) {
          toast.error(`กรุณากรอกข้อมูลรายการ #${j + 1} ของอินวอย #${i + 1}`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        declarationNumber,
        declarationDate,
        currencyCode,
        exchangeRate,
        rateDate,
        rateSource,
        companyId: parseInt(companyId!),
        notes,
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          items: inv.items.map((item) => ({
            goodsName: item.goodsName,
            netWeight: item.netWeight || undefined,
            price: item.price,
            totalPrice: item.totalPrice || item.price,
          })),
        })),
      };

      if (isEdit) {
        await updateTransaction(parseInt(transactionId!), payload);
        toast.success('บันทึกการแก้ไขสำเร็จ');
      } else {
        await createTransaction(payload);
        toast.success('สร้างรายการใหม่สำเร็จ');
      }
      navigate(`/company/${companyId}/transactions`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader
        title={isEdit ? 'แก้ไขรายการ' : 'สร้างรายการใหม่'}
        description="กรอกข้อมูลใบขนสินค้า อินวอย และรายการสินค้า"
        action={
          <Button variant="outline" onClick={() => navigate(`/company/${companyId}/transactions`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
        {/* === Header Card === */}
        <Card className="bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ข้อมูลใบขนสินค้า</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เลขที่ใบขนสินค้า <span className="text-destructive">*</span></Label>
                <Input placeholder="DEC-2026-001" value={declarationNumber}
                  onChange={(e) => setDeclarationNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>วันที่ใบขน <span className="text-destructive">*</span></Label>
                <DatePicker value={declarationDate} onChange={handleDeclarationDateChange} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>สกุลเงิน <span className="text-destructive">*</span></Label>
                <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.nameTh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isTHB && (
                <>
                  <div className="space-y-2">
                    <Label>
                      อัตราแลกเปลี่ยน <span className="text-destructive">*</span>
                      {rateLoading && <Loader2 className="inline h-3 w-3 ml-1 animate-spin" />}
                    </Label>
                    <div className="flex gap-2">
                      <Input type="number" step="0.000001" value={exchangeRate}
                        onChange={(e) => { setExchangeRate(e.target.value); setRateSource('MANUAL'); }} />
                      <Badge variant={rateSource === 'BOT' ? 'success' : 'warning'} className="shrink-0 self-center">
                        {rateSource}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่อัตราแลกเปลี่ยน</Label>
                    <DatePicker value={rateDate} onChange={handleRateDateChange} />
                  </div>
                </>
              )}
              {isTHB && (
                <div className="col-span-2 flex items-end">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 w-full">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      💱 สกุลเงินบาท — อัตราแลกเปลี่ยน 1.0 (ไม่ต้องแปลง)
                    </p>
                  </div>
                </div>
              )}
            </div>
            {rateNum > 0 && !isTHB && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm">
                  📌 อัตราแลกเปลี่ยนนี้จะใช้กับ<strong>ทุกอินวอย</strong>ในรายการนี้: <strong>1 {currencyCode} = {formatNumber(exchangeRate, 6)} THB</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === Invoice Cards === */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> อินวอย
              <Badge variant="secondary">{invoices.length}</Badge>
            </h3>
            <Button variant="outline" size="sm" onClick={addInvoice} className="gap-1">
              <Plus className="h-4 w-4" /> เพิ่มอินวอย
            </Button>
          </div>

          {invoices.map((inv, invIdx) => (
            <Card key={invIdx} className="bg-muted/50 rounded-xl border shadow-sm">
              <Collapsible open={inv.isOpen} onOpenChange={() => toggleInvoice(invIdx)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/80 transition-colors rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {inv.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        อินวอย #{invIdx + 1}
                        {inv.invoiceNumber && (
                          <Badge variant="outline">{inv.invoiceNumber}</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{invoiceTotals[invIdx].itemCount} รายการ</span>
                        <span>{currSymbol}{formatNumber(invoiceTotals[invIdx].totalForeign, 4)}</span>
                        <span className="text-primary font-semibold">฿{formatNumber(invoiceTotals[invIdx].totalThb)}</span>
                        {invoices.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeInvoice(invIdx); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-2">
                    {/* Invoice header fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>เลขที่อินวอย <span className="text-destructive">*</span></Label>
                        <Input placeholder="INV-2026-001" value={inv.invoiceNumber}
                          onChange={(e) => updateInvoice(invIdx, 'invoiceNumber', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>วันที่อินวอย</Label>
                        <DatePicker value={inv.invoiceDate}
                          onChange={(v) => updateInvoice(invIdx, 'invoiceDate', v)} />
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-card rounded-md border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="border-b">
                            <th className="py-2 px-3 text-left w-[40px]">#</th>
                            <th className="py-2 px-3 text-left min-w-[200px]">ชื่อสินค้า *</th>
                            <th className="py-2 px-3 text-right w-[120px]">น้ำหนักสุทธิ</th>
                            <th className="py-2 px-3 text-right w-[140px]">ราคา ({currencyCode}) *</th>
                            <th className="py-2 px-3 text-right w-[140px]">ราคารวม ({currencyCode})</th>
                            <th className="py-2 px-3 text-right w-[140px]">ราคา (THB)</th>
                            <th className="py-2 px-3 text-center w-[50px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="border-b hover:bg-muted/30">
                              <td className="py-1.5 px-3 text-muted-foreground">{itemIdx + 1}</td>
                              <td className="py-1.5 px-1">
                                <Input className="h-8 text-sm" placeholder="ชื่อสินค้า" value={item.goodsName}
                                  onChange={(e) => updateItem(invIdx, itemIdx, 'goodsName', e.target.value)} />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input className="h-8 text-sm text-right" type="number" placeholder="0.0000" value={item.netWeight}
                                  onChange={(e) => updateItem(invIdx, itemIdx, 'netWeight', e.target.value)} />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input className="h-8 text-sm text-right" type="number" step="0.01" placeholder="0.00"
                                  value={item.price}
                                  onChange={(e) => updateItem(invIdx, itemIdx, 'price', e.target.value)} />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input className="h-8 text-sm text-right" type="number" step="0.01" placeholder="0.00"
                                  value={item.totalPrice}
                                  onChange={(e) => updateItem(invIdx, itemIdx, 'totalPrice', e.target.value)} />
                              </td>
                              <td className="py-1.5 px-3 text-right text-primary font-semibold">
                                ฿{formatNumber(calcItemThb(item.totalPrice || item.price))}
                              </td>
                              <td className="py-1.5 px-1 text-center">
                                {inv.items.length > 1 && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => removeItem(invIdx, itemIdx)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => addItem(invIdx)} className="gap-1 w-full border-dashed">
                      <Plus className="h-3.5 w-3.5" /> เพิ่มรายการสินค้า
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}

          <Button variant="outline" onClick={addInvoice} className="gap-2 w-full border-dashed border-primary/30 text-primary">
            <Plus className="h-4 w-4" /> เพิ่มอินวอย
          </Button>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>หมายเหตุ</Label>
          <Input placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* === Sticky Summary Bar === */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-muted-foreground">{invoices.length} อินวอย</span>
          <span className="font-semibold">
            {currSymbol}{formatNumber(grandTotalForeign, 4)} {currencyCode}
          </span>
          <span className="font-bold text-primary text-lg">
            ฿{formatNumber(grandTotalThb)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/company/${companyId}/transactions`)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
