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
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
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
  onEdit?: (id: number) => void;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transactionId,
  onEdit,
}: TransactionDetailDialogProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && transactionId) {
      setLoading(true);
      fetch(`/api/transactions/${transactionId}`, { credentials: 'include' })
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
  }, [open, transactionId, onOpenChange]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    ใบขนสินค้า #{transaction?.declarationNumber || '...'}
                  </DialogTitle>
                  {transaction && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
                      className="text-[11px]"
                    >
                      {transaction.rateSource}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  วันที่ใบขน: {formatDate(transaction?.declarationDate)} • สร้างเมื่อ:{' '}
                  {formatDateTime(transaction?.createdAt)}
                </DialogDescription>
              </div>
            </div>

            {/* Top Total Amount Banner */}
            {transaction && (
              <div className="flex items-center sm:flex-col sm:items-end justify-between bg-primary/5 dark:bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 shrink-0">
                <span className="text-[11px] text-muted-foreground font-medium">มูลค่ารวมทั้งสิ้น</span>
                <div className="text-right">
                  <div className="text-base sm:text-lg font-bold text-primary leading-tight">
                    ฿{formatNumber(transaction.thbAmount)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {transaction.currency?.symbol}
                    {formatNumber(transaction.foreignAmount, 4)} {transaction.currencyCode}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-xs">กำลังโหลดรายละเอียดใบขนสินค้า...</p>
          </div>
        ) : !transaction ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            ไม่พบข้อมูลรายการ
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Customer */}
                <div className="p-3 rounded-lg border bg-card/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                    <Building className="h-3.5 w-3.5 text-indigo-500" />
                    <span>ลูกค้า</span>
                  </div>
                  <div className="text-xs font-semibold truncate" title={(transaction as any).customer?.name || '-'}>
                    {(transaction as any).customer?.name || '-'}
                  </div>
                  {(transaction as any).customer?.taxId && (
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      Tax ID: {(transaction as any).customer.taxId}
                    </div>
                  )}
                </div>

                {/* Exchange Rate */}
                <div className="p-3 rounded-lg border bg-card/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span>อัตราแลกเปลี่ยน</span>
                  </div>
                  <div className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatNumber(transaction.exchangeRate, 6)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    วันที่เรท: {formatDate(transaction.rateDate)}
                  </div>
                </div>

                {/* Invoices Count */}
                <div className="p-3 rounded-lg border bg-card/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                    <Receipt className="h-3.5 w-3.5 text-amber-500" />
                    <span>จำนวนอินวอย</span>
                  </div>
                  <div className="text-xs font-semibold">
                    {transaction.invoices?.length || 0} ใบกำกับสินค้า
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    รวม {transaction.invoices?.reduce((acc, inv) => acc + (inv.items?.length || 0), 0) || 0} รายการสินค้า
                  </div>
                </div>

                {/* Creator */}
                <div className="p-3 rounded-lg border bg-card/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span>ผู้บันทึก</span>
                  </div>
                  <div className="text-xs font-semibold truncate" title={transaction.user?.name || '-'}>
                    {transaction.user?.name || '-'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate" title={transaction.user?.email || ''}>
                    {transaction.user?.email || '-'}
                  </div>
                </div>
              </div>

              {/* Notes (if any) */}
              {transaction.notes && (
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-xs">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 mr-1.5">หมายเหตุ:</span>
                  <span className="text-amber-900 dark:text-amber-200">{transaction.notes}</span>
                </div>
              )}

              {/* Invoices & Items Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">รายละเอียดอินวอยและสินค้า (Invoices & Items)</h3>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal">
                    ทั้งหมด {transaction.invoices?.length || 0} อินวอย
                  </Badge>
                </div>

                {transaction.invoices && transaction.invoices.length > 0 ? (
                  <div className="space-y-4">
                    {transaction.invoices.map((inv, invIndex) => (
                      <div
                        key={inv.id || invIndex}
                        className="rounded-xl border bg-card/80 shadow-xs overflow-hidden"
                      >
                        {/* Invoice Sub-header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 px-4 bg-muted/40 border-b gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {invIndex + 1}
                            </span>
                            <div>
                              <div className="text-xs font-bold flex items-center gap-2">
                                <span>เลขที่อินวอย: {inv.invoiceNumber}</span>
                                <Badge variant="secondary" className="text-[10px] h-4 py-0">
                                  {inv.items?.length || 0} รายการ
                                </Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                วันที่อินวอย: {formatDate(inv.invoiceDate)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right self-end sm:self-auto">
                            <div>
                              <div className="text-xs font-bold text-primary">
                                ฿{formatNumber(inv.totalThb)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatNumber(inv.totalForeign, 4)} {transaction.currencyCode}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow className="bg-muted/10 hover:bg-muted/10">
                                <TableHead className="h-7 text-[10px] w-10 text-center font-medium">#</TableHead>
                                <TableHead className="h-7 text-[10px] font-medium min-w-[160px]">ชื่อสินค้า (Goods Name)</TableHead>
                                <TableHead className="h-7 text-[10px] text-right font-medium">น้ำหนักสุทธิ</TableHead>
                                <TableHead className="h-7 text-[10px] text-right font-medium">
                                  ราคาต่อหน่วย ({transaction.currencyCode})
                                </TableHead>
                                <TableHead className="h-7 text-[10px] text-right font-medium">
                                  ราคาต่อหน่วย (THB)
                                </TableHead>
                                <TableHead className="h-7 text-[10px] text-right font-medium">
                                  ราคารวม ({transaction.currencyCode})
                                </TableHead>
                                <TableHead className="h-7 text-[10px] text-right font-medium text-primary">
                                  ราคารวม (THB)
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inv.items && inv.items.length > 0 ? (
                                inv.items.map((item, itemIdx) => (
                                  <TableRow key={item.id || itemIdx} className="hover:bg-muted/20">
                                    <TableCell className="py-2 text-[11px] text-center text-muted-foreground font-mono">
                                      {item.itemNo || itemIdx + 1}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] font-medium">
                                      {item.goodsName}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-right text-muted-foreground font-mono">
                                      {item.netWeight ? formatNumber(item.netWeight, 3) : '-'}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-right font-mono">
                                      {formatNumber(item.price, 4)}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-right font-mono text-muted-foreground">
                                      ฿{formatNumber(item.priceTHB, 2)}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-right font-mono font-medium">
                                      {formatNumber(item.totalPrice, 4)}
                                    </TableCell>
                                    <TableCell className="py-2 text-[11px] text-right font-mono font-semibold text-primary">
                                      ฿{formatNumber(item.totalPriceTHB, 2)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={7} className="py-4 text-center text-muted-foreground text-xs">
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
                  <div className="py-6 text-center text-muted-foreground text-xs border rounded-lg">
                    ไม่มีข้อมูลอินวอยในรายการนี้
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Footer Actions */}
        <DialogFooter className="p-3 px-4 sm:px-6 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            ID รายการ: #{transaction?.id || '-'}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {transaction && onEdit && (
              <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'DATA_ENTRY']}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
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
              className="h-8 text-xs"
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
