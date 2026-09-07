import { useState, useEffect } from 'react';
import { useProductStore } from '@/stores/product-store';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ProductManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductManagerDialog({ open, onOpenChange }: ProductManagerDialogProps) {
  const { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct } = useProductStore();
  const [search, setSearch] = useState('');
  
  // Create / Edit state
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (open) fetchProducts();
  }, [open, fetchProducts]);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
    setEditId(null);
    setName('');
    setFormOpen(true);
  };

  const handleEdit = (p: { id: number, name: string }) => {
    setEditId(p.id);
    setName(p.name);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      if (editId) {
        await updateProduct(editId, name.trim());
        toast.success('แก้ไขชื่อสินค้าสำเร็จ');
      } else {
        await createProduct(name.trim());
        toast.success('เพิ่มสินค้าใหม่สำเร็จ');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      toast.success('ลบสินค้าสำเร็จ (Soft delete)');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            จัดการฐานข้อมูลสินค้า
          </DialogTitle>
          <DialogDescription className="mt-1">
            รายชื่อสินค้าเหล่านี้จะถูกใช้ร่วมกันเป็น Autocomplete ในหน้าสร้างใบขนสินค้า (ใช้ร่วมกันทุกบริษัท)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="ค้นหาชื่อสินค้า..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> เพิ่มสินค้า
            </Button>
          </div>

          <div className="flex-1 overflow-auto rounded-md border min-h-0">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[80px] text-center">ID</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="w-[150px]">สร้างโดย</TableHead>
                  <TableHead className="w-[150px]">วันที่สร้าง</TableHead>
                  <TableHead className="text-right w-[100px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                      {search ? `ไม่พบสินค้า "${search}"` : 'ยังไม่มีรายการสินค้า'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-center text-xs text-muted-foreground">{product.id}</TableCell>
                      <TableCell className="font-medium text-sm">{product.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{product.user?.name || product.createdBy || 'System'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{product.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'แก้ไขชื่อสินค้า' : 'เพิ่มสินค้าใหม่'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>ชื่อสินค้า</Label>
              <Input 
                autoFocus
                placeholder="ระบุชื่อสินค้า"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 p-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                บันทึก
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสินค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสินค้านี้ใช่หรือไม่? (การลบนี้จะไม่กระทบกับอินวอยเดิมที่เคยใช้ชื่อสินค้านี้ไปแล้ว)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบสินค้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
