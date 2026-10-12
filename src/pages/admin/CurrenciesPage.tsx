import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Coins, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
  code: string;
  nameTh: string;
  nameEn: string;
  symbol: string;
  _count?: { transactions: number };
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCode, setFormCode] = useState('');
  const [formNameTh, setFormNameTh] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formSymbol, setFormSymbol] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filteredCurrencies = searchQuery.trim()
    ? currencies.filter((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) || c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
    : currencies;

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/currencies/admin', { credentials: 'include' });
      const json = await res.json();
      setCurrencies(json.data || []);
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดข้อมูลสกุลเงินได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const resetForm = () => {
    setFormCode('');
    setFormNameTh('');
    setFormNameEn('');
    setFormSymbol('');
    setEditingCurrency(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Currency) => {
    setEditingCurrency(c);
    setFormCode(c.code);
    setFormNameTh(c.nameTh);
    setFormNameEn(c.nameEn);
    setFormSymbol(c.symbol);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formCode.trim() || !formNameTh.trim() || !formNameEn.trim()) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็น');
      return;
    }

    setSaving(true);
    try {
      if (editingCurrency) {
        const res = await fetch(`/api/currencies/admin/${editingCurrency.code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nameTh: formNameTh, nameEn: formNameEn, symbol: formSymbol }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to update');
        }
        toast.success('แก้ไขสกุลเงินสำเร็จ');
      } else {
        const res = await fetch('/api/currencies/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: formCode.toUpperCase(), nameTh: formNameTh, nameEn: formNameEn, symbol: formSymbol }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to create');
        }
        toast.success('เพิ่มสกุลเงินสำเร็จ');
      }
      setDialogOpen(false);
      resetForm();
      fetchCurrencies();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCurrency) return;
    try {
      const res = await fetch(`/api/currencies/admin/${deletingCurrency.code}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete');
      }
      toast.success(`ลบสกุลเงิน ${deletingCurrency.code} สำเร็จ`);
      fetchCurrencies();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCurrency(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="จัดการสกุลเงิน" description="เพิ่ม แก้ไข หรือลบสกุลเงินในระบบ (Admin only)" />

      <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">
        {/* Top bar: search + add button */}
        <div className="flex items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="ค้นหาสกุลเงิน (code, ชื่อ)..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มสกุลเงิน
          </Button>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="shrink-0 pb-2">
            <CardTitle className="text-lg">รายการสกุลเงิน <span className="text-sm font-normal text-muted-foreground ml-2">{filteredCurrencies.length} สกุลเงิน</span></CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCurrencies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{searchQuery.trim() ? 'ไม่พบสกุลเงินที่ค้นหา' : 'ยังไม่มีสกุลเงิน'}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-md min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center py-2 h-9 text-xs font-medium">#</TableHead>
                      <TableHead className="w-[80px] py-2 h-9 text-xs font-medium">Code</TableHead>
                      <TableHead className="w-[60px] py-2 h-9 text-xs font-medium">Symbol</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">ชื่อไทย</TableHead>
                      <TableHead className="py-2 h-9 text-xs font-medium">ชื่ออังกฤษ</TableHead>
                      <TableHead className="text-center py-2 h-9 text-xs font-medium">จำนวนรายการ</TableHead>
                      <TableHead className="text-right py-2 h-9 text-xs font-medium">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCurrencies.slice((page - 1) * perPage, page * perPage).map((c, index) => (
                      <TableRow key={c.code} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center text-muted-foreground text-xs py-1.5 h-10">
                          {(page - 1) * perPage + index + 1}
                        </TableCell>
                        <TableCell className="py-1.5 h-10">
                          <Badge variant="outline" className="text-[10px] shadow-none">{c.code}</Badge>
                        </TableCell>
                        <TableCell className="text-base py-1.5 h-10">{c.symbol || '—'}</TableCell>
                        <TableCell className="font-medium text-sm py-1.5 h-10">{c.nameTh}</TableCell>
                        <TableCell className="text-muted-foreground text-xs py-1.5 h-10">{c.nameEn}</TableCell>
                        <TableCell className="text-center py-1.5 h-10">
                          <Badge variant="secondary" className="text-[10px] shadow-none">{c._count?.transactions ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="xs" onClick={() => handleOpenEdit(c)} className="gap-1 h-7 text-[10px]">
                              <Pencil className="h-3 w-3" />
                              แก้ไข
                            </Button>
                            {(c._count?.transactions ?? 0) === 0 && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => { setDeletingCurrency(c); setDeleteDialogOpen(true); }}
                                className="gap-1 text-destructive hover:text-destructive h-7 text-[10px]"
                              >
                                <Trash2 className="h-3 w-3" />
                                ลบ
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && filteredCurrencies.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 pb-1 px-1 gap-4 mt-auto border-t">
                <div className="text-sm text-muted-foreground">
                  รายการทั้งหมด <span className="font-medium text-foreground">{filteredCurrencies.length}</span> รายการ
                </div>
                {Math.ceil(filteredCurrencies.length / perPage) > 1 && (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      หน้า <span className="font-medium text-foreground">{page}</span> จาก {Math.ceil(filteredCurrencies.length / perPage)}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1}
                        onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= Math.ceil(filteredCurrencies.length / perPage)}
                        onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingCurrency ? 'แก้ไขสกุลเงิน' : 'เพิ่มสกุลเงินใหม่'}</DialogTitle>
            <DialogDescription>
              {editingCurrency ? 'แก้ไขข้อมูลสกุลเงิน' : 'กรอกข้อมูลสกุลเงินที่ต้องการเพิ่ม'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="currency-code">
                รหัสสกุลเงิน (Code) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-code"
                placeholder="เช่น USD, EUR, CNY"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                maxLength={10}
                disabled={!!editingCurrency}
              />
              {editingCurrency && (
                <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยน code ได้</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-name-th">
                ชื่อภาษาไทย <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name-th"
                placeholder="เช่น ดอลลาร์สหรัฐ"
                value={formNameTh}
                onChange={(e) => setFormNameTh(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-name-en">
                ชื่อภาษาอังกฤษ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currency-name-en"
                placeholder="เช่น US Dollar"
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency-symbol">สัญลักษณ์</Label>
              <Input
                id="currency-symbol"
                placeholder="เช่น $, €, ¥, ₩"
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                maxLength={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCurrency ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสกุลเงิน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสกุลเงิน <strong>"{deletingCurrency?.code}"</strong> ({deletingCurrency?.nameTh}) ใช่หรือไม่?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                การลบสกุลเงินนี้ไม่สามารถย้อนกลับได้
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบสกุลเงิน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
