import { useEffect, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
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
  ArrowLeftRight,
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
      <DialogContent showCloseButton={false} className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        {/* Fixed Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b bg-muted/30 shrink-0 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <DialogTitle className="text-base sm:text-lg md:text-xl font-bold tracking-tight truncate flex items-center gap-2">
                      ใบขนสินค้า #{transaction?.declarationNumber || '...'}
                      {transaction && (
                        <Badge variant={transaction.type === 'EXPORT' ? 'success' : 'default'} className="text-[10px] px-1.5 py-0 font-normal shadow-none align-middle">
                          {transaction.type === 'EXPORT' ? 'ขาออก' : 'ขาเข้า'}
                        </Badge>
                      )}
                    </DialogTitle>
                  {transaction && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
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
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 sm:mt-1 flex items-center gap-2 flex-wrap truncate">
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
              <div className="flex items-center md:flex-col md:items-end justify-between bg-primary/5 dark:bg-primary/10 px-3.5 py-2 sm:px-4 sm:py-1.5 rounded-xl border border-primary/20 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium uppercase tracking-wider">มูลค่ารวมทั้งสิ้น</span>
                <div className="text-right">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary leading-tight">
                    ฿{formatNumber(transaction.thbAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {transaction.currency?.symbol}
                    {formatNumber(transaction.foreignAmount, 4)} {transaction.currencyCode}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content Body with Defined Height matching TransactionDialog */}
        {loading ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">กำลังโหลดรายละเอียดใบขนสินค้า...</p>
          </div>
        ) : !transaction ? (
          <div className="flex-1 min-h-0 flex items-center justify-center py-24 text-muted-foreground text-sm">
            ไม่พบข้อมูลรายการ
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6 w-full">
              {/* Metadata Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full">
                {/* Customer */}
                <div className="p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5 min-w-0">
                    <Building className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="truncate">ลูกค้า (Customer)</span>
                  </div>
                  <div className="text-sm font-semibold truncate" title={(transaction as any).customer?.name || '-'}>
                    {(transaction as any).customer?.name || '-'}
                  </div>
                  {(transaction as any).customer?.taxId && (
                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                      Tax ID: {(transaction as any).customer.taxId}
                    </div>
                  )}
                </div>

                {/* Exchange Rate */}
                <div className="p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5 min-w-0">
                    <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="truncate">อัตราแลกเปลี่ยน (Rate)</span>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    {formatNumber(transaction.exchangeRate, 6)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    วันที่เรท: {formatDate(transaction.rateDate)}
                  </div>
                </div>

                {/* Invoices Count */}
                <div className="p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5 min-w-0">
                    <Receipt className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="truncate">จำนวนอินวอย (Invoices)</span>
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {transaction.invoices?.length || 0} ใบกำกับสินค้า
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    รวม {transaction.invoices?.reduce((acc, inv) => acc + (inv.items?.length || 0), 0) || 0} รายการสินค้า
                  </div>
                </div>

                {/* Creator */}
                <div className="p-3.5 rounded-xl border bg-card/60 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-colors min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5 min-w-0">
                    <User className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="truncate">ผู้บันทึก (Created By)</span>
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
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs w-full min-w-0 break-words">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 mr-2">หมายเหตุ:</span>
                  <span className="text-amber-900 dark:text-amber-200 leading-relaxed">{transaction.notes}</span>
                </div>
              )}

              {/* Invoices & Items Breakdown */}
              <div className="space-y-4 w-full min-w-0">
                <div className="flex items-center justify-between pb-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">รายละเอียดอินวอยและสินค้า (Invoices & Items)</h3>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 shrink-0">
                    ทั้งหมด {transaction.invoices?.length || 0} อินวอย
                  </Badge>
                </div>

                {transaction.invoices && transaction.invoices.length > 0 ? (
                  <div className="space-y-5 w-full min-w-0">
                    {transaction.invoices.map((inv, invIndex) => (
                      <div
                        key={inv.id || invIndex}
                        className="rounded-xl border bg-card shadow-xs overflow-hidden w-full flex flex-col min-w-0"
                      >
                        {/* Invoice Header */}
                        <div className="flex items-center gap-3 py-2 px-4 sm:px-5 bg-muted/40 border-b min-w-0">
                          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 shrink-0 self-start sm:self-center">
                            {invIndex + 1}
                          </span>
                          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                            <div className="text-xs sm:text-sm font-bold flex items-center gap-2 flex-wrap min-w-0">
                              <span className="truncate max-w-full">เลขที่อินวอย: {inv.invoiceNumber}</span>
                              <Badge variant="secondary" className="text-[10px] sm:text-[11px] h-5 py-0 shrink-0">
                                {inv.items?.length || 0} รายการ
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground shrink-0">
                              วันที่อินวอย: {formatDate(inv.invoiceDate)}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Swipe Hint */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:hidden px-3.5 py-1.5 bg-muted/20 border-b shrink-0">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                          <span className="truncate">เลื่อนซ้าย-ขวาเพื่อดูคอลัมน์ทั้งหมด</span>
                        </div>

                        {/* Table using the exact same standard overflow pattern as data-table.tsx */}
                        <div className="w-full overflow-x-auto min-h-0 bg-background custom-scrollbar">
                          <Table className="text-xs min-w-[850px] caption-bottom">
                            <TableHeader>
                              <TableRow className="bg-muted/20 hover:bg-muted/20">
                                <TableHead className="h-7 px-3 text-[11px] w-12 text-center font-medium">#</TableHead>
                                <TableHead className="h-7 px-3 text-[11px] font-medium min-w-[200px]">ชื่อสินค้า (Goods Name)</TableHead>
                                {transaction.type === 'IMPORT' ? (
                                  <>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[70px]">จำนวน</TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[80px]">นน. สุทธิ (NW)</TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[100px]">
                                      ค่าระวาง (Freight)
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[100px]">
                                      ค่าประกัน (Ins.)
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[120px] font-bold text-foreground">
                                      ราคาสินค้า ({transaction.currencyCode})
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[120px] font-bold text-foreground">
                                      รวม CIF ({transaction.currencyCode})
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium text-primary min-w-[130px]">
                                      รวม CIF (THB)
                                    </TableHead>
                                  </>
                                ) : (
                                  <>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[100px]">น้ำหนักสุทธิ</TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[120px]">
                                      ราคา/หน่วย ({transaction.currencyCode})
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[120px]">
                                      ราคา/หน่วย (THB)
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium min-w-[130px] font-bold text-primary">
                                      ราคารวม FOB ({transaction.currencyCode})
                                    </TableHead>
                                    <TableHead className="h-7 px-3 text-[11px] text-right font-medium text-primary min-w-[130px]">
                                      ราคารวม FOB (THB)
                                    </TableHead>
                                  </>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inv.items && inv.items.length > 0 ? (
                                inv.items.map((item, itemIdx) => {
                                  const baseGoods = Number(item.fobPrice) > 0 ? Number(item.fobPrice) : (Number(item.totalPrice) || 0);
                                  const cifFcy = baseGoods + (Number(item.freight) || 0) + (Number(item.insurance) || 0);
                                  return (
                                    <TableRow key={item.id || itemIdx} className="hover:bg-muted/25 transition-colors">
                                      <TableCell className="py-1.5 px-3 text-xs text-center text-muted-foreground">
                                        {item.itemNo || itemIdx + 1}
                                      </TableCell>
                                      <TableCell className="py-1.5 px-3 text-xs font-medium text-foreground whitespace-normal break-words max-w-[300px]">
                                        {item.goodsName}
                                      </TableCell>
                                      {transaction.type === 'IMPORT' ? (
                                        <>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            {item.quantity ? formatNumber(item.quantity, 0) : '1'}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            {item.netWeight ? formatNumber(item.netWeight, 2) : '-'}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            {item.freight ? formatNumber(item.freight, 2) : '0.00'}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            {item.insurance ? formatNumber(item.insurance, 2) : '0.00'}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right font-medium text-foreground">
                                            {formatNumber(baseGoods, 4)}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right font-bold text-foreground">
                                            {formatNumber(cifFcy, 4)}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right font-bold text-primary">
                                            ฿{formatNumber(item.totalPriceTHB, 2)}
                                          </TableCell>
                                        </>
                                      ) : (
                                        <>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            {item.netWeight ? formatNumber(item.netWeight, 3) : '-'}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-foreground font-medium">
                                            {formatNumber(item.price, 4)}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right text-muted-foreground">
                                            ฿{formatNumber(item.priceTHB, 2)}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right font-bold text-foreground">
                                            {formatNumber(item.totalPrice, 4)}
                                          </TableCell>
                                          <TableCell className="py-1.5 px-3 text-xs text-right font-bold text-primary">
                                            ฿{formatNumber(item.totalPriceTHB, 2)}
                                          </TableCell>
                                        </>
                                      )}
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={transaction.type === 'IMPORT' ? 9 : 7} className="py-6 text-center text-muted-foreground text-xs border-0">
                                    ไม่มีรายการสินค้า
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                            <TableFooter className="bg-muted/10 border-t">
                              {(() => {
                                const invCifFcy = inv.items?.reduce((sum, it) => {
                                  const b = Number(it.fobPrice) > 0 ? Number(it.fobPrice) : (Number(it.totalPrice) || 0);
                                  return sum + b + (Number(it.freight) || 0) + (Number(it.insurance) || 0);
                                }, 0) || Number(inv.totalForeign) || 0;
                                return (
                                  <TableRow className="hover:bg-muted/10">
                                    <TableCell colSpan={6} className="py-2 px-2 text-right font-bold text-xs text-muted-foreground">
                                      รวมมูลค่าอินวอยนี้
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-bold text-foreground text-xs">
                                      {formatNumber(inv.totalForeign, 4)}
                                    </TableCell>
                                    {transaction.type === 'IMPORT' && (
                                      <TableCell className="py-2 px-3 text-right font-bold text-foreground text-xs">
                                        {formatNumber(invCifFcy, 4)}
                                      </TableCell>
                                    )}
                                    <TableCell className="py-2 px-3 text-right font-bold text-primary text-xs">
                                      ฿{formatNumber(inv.totalThb, 2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })()}
                            </TableFooter>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-xs border rounded-xl bg-muted/10 min-w-0">
                    ไม่มีข้อมูลอินวอยในรายการนี้
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fixed Footer */}
        <DialogFooter className="p-3.5 px-4 sm:px-6 border-t bg-muted/30 shrink-0 flex flex-row items-center justify-between sm:justify-between min-w-0">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5 min-w-0">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Transaction ID: {transaction?.id || '-'}</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto shrink-0">
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
