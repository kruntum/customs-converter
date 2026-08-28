import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Building,
  TrendingUp,
  Receipt,
  User,
  Package,
  Pencil,
  Copy,
  Check,
  Loader2,
  CalendarDays,
  Hash,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';
import { CurrencyBadge } from '@/components/currency-badge';
import { RoleProtect } from '@/components/role-protect';
import { toast } from 'sonner';
import type { Transaction } from '@/stores/transaction-store';

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: number | null;
  companyId?: number;
  onEdit?: (id: number) => void;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transactionId,
  companyId,
  onEdit,
}: TransactionDetailDialogProps) {
  const { companyId: routeCompanyId } = useParams();
  const activeCompanyId = companyId || (routeCompanyId ? parseInt(routeCompanyId) : 1);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && transactionId) {
      setLoading(true);
      const url = `/api/transactions/${transactionId}?companyId=${activeCompanyId}`;
      fetch(url, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('ไม่พบข้อมูลรายการ');
          return res.json();
        })
        .then((json) => setTransaction(json.data))
        .catch((err) => {
          toast.error(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
          onOpenChange(false);
        })
        .finally(() => setLoading(false));
    } else {
      setTransaction(null);
    }
  }, [open, transactionId, activeCompanyId, onOpenChange]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('คัดลอกเลขที่ใบขนแล้ว');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm น.', { locale: th });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl h-[92vh] sm:h-[90vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl border-border">
        {/* Fixed Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg md:text-xl font-bold tracking-tight">
                    ใบขนสินค้า #{transaction?.declarationNumber || '...'}
                  </DialogTitle>
                  {transaction && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => handleCopy(transaction.declarationNumber)}
                      title="คัดลอกเลขที่ใบขน"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  {transaction && (
                    <CurrencyBadge
                      code={transaction.currencyCode}
                      symbol={transaction.currency?.symbol}
                    />
                  )}
                  {transaction?.rateSource && (
                    <Badge
                      variant={transaction.rateSource === 'BOT' ? 'info' : 'muted'}
                      className="text-[10px] sm:text-[11px] font-medium"
                    >
                      {transaction.rateSource}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 sm:mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> วันที่ใบขน: {formatDate(transaction?.declarationDate)}
                  </span>
                  <span>•</span>
                  <span>สร้างเมื่อ: {formatDateTime(transaction?.createdAt)}</span>
                </DialogDescription>
              </div>
            </div>

            {/* Top Total Amount Card */}
            {transaction && (
              <div className="flex items-center md:flex-col md:items-end justify-between bg-primary/5 dark:bg-primary/10 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-primary/20 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">มูลค่ารวมทั้งสิ้น</span>
                <div className="text-right">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary leading-tight font-mono">
                    ฿{formatNumber(transaction.thbAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {transaction.currency?.symbol}
                    {formatNumber(transaction.foreignAmount, 4)} {transaction.currencyCode}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground min-h-0">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">กำลังโหลดรายละเอียดใบขนสินค้า...</p>
          </div>
        ) : !transaction ? (
          <div className="flex-1 flex items-center justify-center py-24 text-muted-foreground text-sm min-h-0">
            ไม่พบข้อมูลรายการ
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-4 sm:p-6 space-y-6">
              {/* Metadata Cards Grid (1 column on mobile, 2 columns on tablet, 4 on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
                {/* Customer */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
                    <Building className="h-4 w-4 text-indigo-500" />
                    <span>ลูกค้า (Customer)</span>
                  </div>
                  <div className="text-sm font-semibold truncate" title={(transaction as any).customer?.name || '-'}>
                    {(transaction as any).customer?.name || '-'}
                  </div>
                  {(transaction as any).customer?.taxId && (
                    <div className="text-[11px] text-muted-foreground font-mono mt-1">
                      Tax ID: {(transaction as any).customer.taxId}
                    </div>
                  )}
                </div>

                {/* Exchange Rate */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span>อัตราแลกเปลี่ยน (Rate)</span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatNumber(transaction.exchangeRate, 6)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    วันที่เรท: {formatDate(transaction.rateDate)}
                  </div>
                </div>

                {/* Invoices Count */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
                    <Receipt className="h-4 w-4 text-amber-500" />
                    <span>จำนวนอินวอย (Invoices)</span>
                  </div>
                  <div className="text-sm font-semibold">
                    {transaction.invoices?.length || 0} ใบกำกับสินค้า
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    รวม {transaction.invoices?.reduce((acc, inv) => acc + (inv.items?.length || 0), 0) || 0} รายการสินค้า
                  </div>
                </div>

                {/* Creator */}
                <div className="p-3 sm:p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
                    <User className="h-4 w-4 text-blue-500" />
                    <span>ผู้บันทึก (Created By)</span>
                  </div>
                  <div className="text-sm font-semibold truncate" title={transaction.user?.name || '-'}>
                    {transaction.user?.name || '-'}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-1" title={transaction.user?.email || ''}>
                    {transaction.user?.email || '-'}
                  </div>
                </div>
              </div>

              {/* Notes (if any) */}
              {transaction.notes && (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 mr-2">หมายเหตุ:</span>
                  <span className="text-amber-900 dark:text-amber-200 leading-relaxed">{transaction.notes}</span>
                </div>
              )}

              {/* Invoices & Items Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="text-sm sm:text-base font-bold tracking-tight">รายละเอียดอินวอยและสินค้า (Invoices & Items)</h3>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5">
                    ทั้งหมด {transaction.invoices?.length || 0} อินวอย
                  </Badge>
                </div>

                {transaction.invoices && transaction.invoices.length > 0 ? (
                  <div className="space-y-5">
                    {transaction.invoices.map((inv, invIndex) => (
                      <div
                        key={inv.id || invIndex}
                        className="rounded-xl border bg-card shadow-xs overflow-hidden"
                      >
                        {/* Invoice Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 px-4 sm:px-5 bg-muted/40 border-b gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 shrink-0">
                              {invIndex + 1}
                            </span>
                            <div>
                              <div className="text-xs sm:text-sm font-bold flex items-center gap-2 flex-wrap">
                                <span>เลขที่อินวอย: {inv.invoiceNumber}</span>
                                <Badge variant="secondary" className="text-[10px] sm:text-[11px] h-5 py-0">
                                  {inv.items?.length || 0} รายการ
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                วันที่อินวอย: {formatDate(inv.invoiceDate)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right self-end sm:self-auto">
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-primary font-mono">
                                ฿{formatNumber(inv.totalThb)}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {formatNumber(inv.totalForeign, 4)} {transaction.currencyCode}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Items Table with Horizontal Scrollable Container */}
                        <div className="w-full overflow-x-auto">
                          <Table className="text-xs min-w-[780px]">
                            <TableHeader>
                              <TableRow className="bg-muted/15 hover:bg-muted/15">
                                <TableHead className="h-8 text-[11px] w-12 text-center font-medium">#</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium min-w-[200px]">ชื่อสินค้า (Goods Name)</TableHead>
                                <TableHead className="h-8 text-[11px] text-right font-medium min-w-[100px]">น้ำหนักสุทธิ</TableHead>
                                <TableHead className="h-8 text-[11px] text-right font-medium min-w-[120px]">
                                  ราคาต่อหน่วย ({transaction.currencyCode})
                                </TableHead>
                                <TableHead className="h-8 text-[11px] text-right font-medium min-w-[120px]">
                                  ราคาต่อหน่วย (THB)
                                </TableHead>
                                <TableHead className="h-8 text-[11px] text-right font-medium min-w-[130px]">
                                  ราคารวม ({transaction.currencyCode})
                                </TableHead>
                                <TableHead className="h-8 text-[11px] text-right font-medium text-primary min-w-[130px]">
                                  ราคารวม (THB)
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inv.items && inv.items.length > 0 ? (
                                inv.items.map((item, itemIdx) => (
                                  <TableRow key={item.id || itemIdx} className="hover:bg-muted/25 transition-colors">
                                    <TableCell className="py-2.5 text-xs text-center text-muted-foreground font-mono">
                                      {item.itemNo || itemIdx + 1}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs font-medium">
                                      {item.goodsName}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right text-muted-foreground font-mono">
                                      {item.netWeight ? formatNumber(item.netWeight, 3) : '-'}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right font-mono">
                                      {formatNumber(item.price, 4)}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right font-mono text-muted-foreground">
                                      ฿{formatNumber(item.priceTHB, 2)}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right font-mono font-medium">
                                      {formatNumber(item.totalPrice, 4)}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right font-mono font-bold text-primary">
                                      ฿{formatNumber(item.totalPriceTHB, 2)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground text-xs">
                                    ไม่มีรายการสินค้า
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-xs border rounded-xl bg-muted/10">
                    ไม่มีข้อมูลอินวอยในรายการนี้
                  </div>
                )}
              </div>
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        )}

        {/* Fixed Footer */}
        <DialogFooter className="p-3.5 px-4 sm:px-6 border-t bg-muted/30 shrink-0 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5 font-mono">
            <Hash className="h-3.5 w-3.5" />
            <span>Transaction ID: {transaction?.id || '-'}</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            {transaction && onEdit && (
              <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'DATA_ENTRY']}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8.5 text-xs font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(transaction.id);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  แก้ไขรายการ
                </Button>
              </RoleProtect>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="h-8.5 px-4 text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              ปิด
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
