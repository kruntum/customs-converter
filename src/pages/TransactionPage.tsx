import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTransactionStore } from '@/stores/transaction-store';
import { useCustomerStore } from '@/stores/customer-store';
import { TransactionDialog } from '@/components/transaction-dialog';
import { TransactionDetailDialog } from '@/components/transaction-detail-dialog';
import { ProductManagerDialog } from '@/components/product-manager-dialog';
import { CustomerManagerDialog } from '@/components/customer-manager-dialog';
import { PageHeader } from '@/components/page-header';
import { RoleProtect } from '@/components/role-protect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, Search, FileText, Pencil, Trash2, Eye, ChevronDown, ChevronRight, Package, Users, Download, ChevronsUpDown, Check, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { CurrencyBadge } from '@/components/currency-badge';

export default function TransactionPage() {
  const { companyId } = useParams();
  const {
    transactions, pagination, loading, searchQuery,
    setSearchQuery, setCompanyId, setLimit, fetchTransactions, deleteTransaction,
    filterCurrency, filterCustomerId,
    setFilterCurrency, setFilterCustomerId,
    filterYear, filterMonth, setFilterYear, setFilterMonth,
  } = useTransactionStore();

  const { customers, fetchCustomers } = useCustomerStore();
  const cId = parseInt(companyId || '0');
  const companyCustomers = customers[cId] || [];

  const [currencies, setCurrencies] = useState<{ code: string; nameTh: string; symbol: string }[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [productManagerOpen, setProductManagerOpen] = useState(false);
  const [customerManagerOpen, setCustomerManagerOpen] = useState(false);
  
  const [expandedTxIds, setExpandedTxIds] = useState<Set<number>>(new Set());
  const [expandedInvIds, setExpandedInvIds] = useState<Set<number>>(new Set());
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      const parsedId = parseInt(companyId);
      setCompanyId(parsedId);
      fetchTransactions(1);
    }
  }, [companyId, setCompanyId, fetchTransactions]);

  // Fetch customer & currency lists for filter dropdowns
  useEffect(() => {
    if (cId) {
      fetchCustomers(cId);
      fetch('/api/currencies', { credentials: 'include' })
        .then(r => r.json())
        .then(j => setCurrencies(j.data || []))
        .catch(() => {});
    }
  }, [cId, fetchCustomers]);

  const handleSearch = () => fetchTransactions(1);

  const handleCreate = () => {
    setEditId(null);
    setDialogOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditId(id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTransaction(deleteId);
      toast.success('ลบรายการสำเร็จ');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy'); }
    catch { return d; }
  };

  const toggleTx = (id: number) => {
    const next = new Set(expandedTxIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTxIds(next);
  };

  const toggleInv = (id: number) => {
    const next = new Set(expandedInvIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedInvIds(next);
  };

  const handleExportExcel = async () => {
    if (transactions.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const XLSX = await import('xlsx');

    const rows: Record<string, unknown>[] = [];
    transactions.forEach((tx, i) => {
      // Main transaction row
      const baseRow = {
        '#': i + 1,
        'เลขที่ใบขน': tx.declarationNumber,
        'วันที่ใบขน': formatDate(tx.declarationDate),
        'ชื่อลูกค้า': (tx as any).customer?.name || '-',
        'สกุลเงิน': tx.currencyCode,
        'อัตราแลกเปลี่ยน': Number(tx.exchangeRate),
        'ยอดต่างประเทศ': Number(tx.foreignAmount),
        'ยอด THB': Number(tx.thbAmount),
        'แหล่งอัตรา': tx.rateSource,
        'เลขที่อินวอย': '',
        'วันที่อินวอย': '',
        'ชื่อสินค้า': '',
        'น้ำหนักสุทธิ': '',
        'ราคา (FCY)': '',
        'ราคา (THB)': '',
      };

      if (tx.invoices && tx.invoices.length > 0) {
        tx.invoices.forEach((inv) => {
          if (inv.items && inv.items.length > 0) {
            inv.items.forEach((item, idx) => {
              rows.push({
                ...baseRow,
                ...(idx === 0 ? {} : { '#': '', 'เลขที่ใบขน': '', 'วันที่ใบขน': '', 'สกุลเงิน': '', 'อัตราแลกเปลี่ยน': '', 'ยอดต่างประเทศ': '', 'ยอด THB': '', 'แหล่งอัตรา': '', 'สถานะชำระ': '', 'ตัดชำระแล้ว (THB)': '' }),
                'เลขที่อินวอย': idx === 0 ? inv.invoiceNumber : '',
                'วันที่อินวอย': idx === 0 ? formatDate(inv.invoiceDate) : '',
                'ชื่อสินค้า': item.goodsName,
                'น้ำหนักสุทธิ': Number(item.netWeight),
                'ราคา (FCY)': Number(item.totalPrice),
                'ราคา (THB)': Number(item.totalPriceTHB),
              });
            });
          } else {
            rows.push({
              ...baseRow,
              'เลขที่อินวอย': inv.invoiceNumber,
              'วันที่อินวอย': formatDate(inv.invoiceDate),
            });
          }
        });
      } else {
        rows.push(baseRow);
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 2, 14)
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    toast.success('ส่งออก Excel สำเร็จ');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader
        title="รายการใบขนสินค้า"
        description="จัดการรายการนำเข้าและอินวอย"
      />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Search + filters + action buttons */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="ค้นหาเลขที่ใบขน / อินวอย / ชื่อสินค้า..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <Button variant="outline" onClick={handleExportExcel} className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950 flex-1 sm:flex-auto">
                <Download className="h-4 w-4" /> ส่งออก Excel
              </Button>
              <Button variant="outline" onClick={() => setCustomerManagerOpen(true)} className="gap-2 text-primary border-primary/20 hover:bg-primary/10 flex-1 sm:flex-auto">
                <Users className="h-4 w-4" /> จัดการลูกค้า
              </Button>
              <Button variant="outline" onClick={() => setProductManagerOpen(true)} className="gap-2 text-primary border-primary/20 hover:bg-primary/10 flex-1 sm:flex-auto">
                <Package className="h-4 w-4" /> จัดการสินค้า
              </Button>
              <Button onClick={handleCreate} className="gap-2 flex-1 sm:flex-auto shadow-sm">
                <Plus className="h-4 w-4" /> สร้างรายการใหม่
              </Button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterCustomerId} onValueChange={(v) => { setFilterCustomerId(v === 'all' ? '' : v); fetchTransactions(1); }}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="ลูกค้าทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
                {companyCustomers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCurrency} onValueChange={(v) => { setFilterCurrency(v === 'all' ? '' : v); fetchTransactions(1); }}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="สกุลเงินทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สกุลเงินทั้งหมด</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} - {c.nameTh}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={yearOpen} className="w-[110px] h-8 text-xs justify-between font-normal">
                  {filterYear || 'ปีทั้งหมด'}
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[140px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="พิมพ์ปี..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">กด Enter เพื่อค้นหา</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="" onSelect={() => { setFilterYear(''); setYearOpen(false); fetchTransactions(1); }} className="text-xs">
                        <Check className={`mr-1 h-3 w-3 ${!filterYear ? 'opacity-100' : 'opacity-0'}`} />
                        ปีทั้งหมด
                      </CommandItem>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map((y) => (
                        <CommandItem key={y} value={String(y)} onSelect={() => { setFilterYear(String(y)); setYearOpen(false); fetchTransactions(1); }} className="text-xs">
                          <Check className={`mr-1 h-3 w-3 ${filterYear === String(y) ? 'opacity-100' : 'opacity-0'}`} />
                          {y}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v === 'all' ? '' : v); fetchTransactions(1); }}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="เดือนทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">เดือนทั้งหมด</SelectItem>
                {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterCustomerId || filterCurrency || filterYear || filterMonth) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setFilterCustomerId(''); setFilterCurrency(''); setFilterYear(''); setFilterMonth(''); fetchTransactions(1); }}>
                ล้างตัวกรอง
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="ยังไม่มีรายการ"
                action={
                  <Button variant="outline" className="gap-2" onClick={handleCreate}>
                    <Plus className="h-4 w-4" /> สร้างรายการแรก
                  </Button>
                }
              />
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-12 text-center font-medium">#</TableHead>
                      <TableHead className="font-medium">เลขที่ใบขน</TableHead>
                      <TableHead className="font-medium">วันที่</TableHead>
                      <TableHead className="font-medium text-center">อินวอย</TableHead>
                      <TableHead className="font-medium">สกุลเงิน</TableHead>
                      <TableHead className="font-medium text-right">อัตรา</TableHead>
                      <TableHead className="font-medium text-right">ยอดต่างประเทศ</TableHead>
                      <TableHead className="font-medium text-right">ยอด THB</TableHead>
                      <TableHead className="font-medium">แหล่ง</TableHead>
                      <TableHead className="font-medium text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx, index) => (
                      <React.Fragment key={tx.id}>
                        <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleTx(tx.id)}>
                          <TableCell className="p-1 text-center">
                            {expandedTxIds.has(tx.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-xs py-1">
                            {(pagination.page - 1) * pagination.limit + index + 1}
                          </TableCell>
                          <TableCell className="font-medium text-xs py-1">{tx.declarationNumber}</TableCell>
                          <TableCell className="text-xs py-1">{formatDate(tx.declarationDate)}</TableCell>
                          <TableCell className="text-center py-1">
                            <Badge variant="secondary">{tx._count?.invoices ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="py-1">
                            <CurrencyBadge code={tx.currencyCode} symbol={tx.currency?.symbol} />
                          </TableCell>
                          <TableCell className="text-right text-xs py-1">{formatNumber(tx.exchangeRate, 6)}</TableCell>
                          <TableCell className="text-right py-1">
                            {tx.currency?.symbol}{formatNumber(tx.foreignAmount, 4)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary py-1">
                            ฿{formatNumber(tx.thbAmount)}
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge 
                              variant={tx.rateSource === 'BOT' ? 'info' : 'muted'} 
                              className="text-[10px] shadow-none"
                            >
                              {tx.rateSource}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-1 h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setViewId(tx.id);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" /> ดูข้อมูล
                              </Button>
                              <RoleProtect allowedRoles={['OWNER', 'ADMIN', 'DATA_ENTRY']}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1 h-7 text-xs"
                                  onClick={() => handleEdit(tx.id)}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> แก้ไข
                                </Button>
                              </RoleProtect>
                              <RoleProtect allowedRoles={['OWNER', 'ADMIN']}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1 h-7 text-xs text-destructive"
                                  onClick={() => setDeleteId(tx.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> ลบ
                                </Button>
                              </RoleProtect>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {expandedTxIds.has(tx.id) && tx.invoices && tx.invoices.length > 0 && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-b-0">
                            <TableCell colSpan={11} className="p-0 border-b-0">
                              <div className="pl-[60px] pr-4 py-3 min-h-0 bg-linear-to-r from-transparent to-muted/20">
                                <Table className="bg-background border rounded-md overflow-hidden">
                                  <TableHeader>
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                      <TableHead className="w-[40px] py-1"></TableHead>
                                      <TableHead className="py-1 text-xs">เลขที่อินวอย</TableHead>
                                      <TableHead className="py-1 text-xs">วันที่อินวอย</TableHead>
                                      <TableHead className="py-1 text-xs text-center">จำนวนสินค้า</TableHead>
                                      <TableHead className="py-1 text-xs text-right">ยอด {tx.currencyCode}</TableHead>
                                      <TableHead className="py-1 text-xs text-right">ยอด THB</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tx.invoices.map((inv) => (
                                      <React.Fragment key={inv.id}>
                                        <TableRow className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleInv(inv.id!)}>
                                          <TableCell className="p-1 text-center">
                                            {expandedInvIds.has(inv.id!) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                                          </TableCell>
                                          <TableCell className="py-1 text-xs">{inv.invoiceNumber}</TableCell>
                                          <TableCell className="py-1 text-xs">{formatDate(inv.invoiceDate)}</TableCell>
                                          <TableCell className="py-1 text-xs text-center"><Badge variant="outline" className="text-[10px] h-4 leading-none">{inv.items?.length || 0}</Badge></TableCell>
                                          <TableCell className="py-1 text-xs text-right">{formatNumber(inv.totalForeign, 4)}</TableCell>
                                          <TableCell className="py-1 text-xs text-right text-primary font-medium">฿{formatNumber(inv.totalThb)}</TableCell>
                                        </TableRow>
                                        
                                        {expandedInvIds.has(inv.id!) && inv.items && inv.items.length > 0 && (
                                          <TableRow className="bg-muted/5 hover:bg-muted/5">
                                            <TableCell colSpan={6} className="p-0 border-b-0">
                                              <div className="pl-[50px] pr-4 py-2 border-l-2 border-primary/20 bg-muted/5 my-1">
                                                <Table className="bg-card border border-muted-foreground/10 rounded-sm">
                                                  <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] w-[30px] text-center">#</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px]">ชื่อสินค้า</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">น้ำหนัก</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">ราคา</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">ราคารวม ({tx.currencyCode})</TableHead>
                                                      <TableHead className="h-6 py-0 px-2 text-[10px] text-right">รวม THB</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {inv.items.map((item, idx) => (
                                                      <TableRow key={item.id} className="hover:bg-muted/20">
                                                        <TableCell className="py-1.5 px-2 text-[10px] text-muted-foreground text-center">{idx + 1}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] font-medium">{item.goodsName}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right text-muted-foreground">{item.netWeight ? formatNumber(item.netWeight, 3) : '-'}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right">{formatNumber(item.price, 4)}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right">{formatNumber(item.totalPrice, 4)}</TableCell>
                                                        <TableCell className="py-1.5 px-2 text-[11px] text-right text-primary/80">฿{formatNumber(item.totalPriceTHB)}</TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && transactions.length > 0 && (
              <DataTablePagination
                total={pagination.total}
                page={pagination.page}
                perPage={pagination.limit}
                onPageChange={(p) => fetchTransactions(p)}
                onPerPageChange={(l) => { setLimit(l); fetchTransactions(1); }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Dialog */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={parseInt(companyId || '0')}
        editId={editId}
        onSaved={() => fetchTransactions(pagination.page)}
      />

      {/* Product Manager Dialog */}
      <ProductManagerDialog
        open={productManagerOpen}
        onOpenChange={setProductManagerOpen}
      />

      {/* Customer Manager Dialog */}
      <CustomerManagerDialog
        open={customerManagerOpen}
        onOpenChange={setCustomerManagerOpen}
        companyId={parseInt(companyId || '0')}
      />

      {/* Transaction Detail View Dialog */}
      <TransactionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        transactionId={viewId}
        onEdit={(id) => {
          setEditId(id);
          setDialogOpen(true);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบรายการนี้ใช่หรือไม่? รายการนี้รวมถึงอินวอยและรายการสินค้าทั้งหมดจะถูกลบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
