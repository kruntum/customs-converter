import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyStore, type Company } from '@/stores/company-store';
import { PageHeader } from '@/components/page-header';
import { CompanyMembersDialog } from '@/components/CompanyMembersDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Ban, Building2, Loader2, ExternalLink, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useSession } from '@/lib/auth-client';

export default function CompanyPage() {
  const navigate = useNavigate();
  const { companies, loading, fetchCompanies, createCompany, updateCompany, deleteCompany } =
    useCompanyStore();

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const globalRole = (session?.user as { role?: string } | undefined)?.role;
  const isGlobalAdmin = globalRole === 'admin';

  const canManageCompany = (company: Company) => {
    if (isGlobalAdmin) return true;
    if (company.createdBy === userId) return true;
    const member = company.companyUsers?.find((cu) => cu.userId === userId);
    return member && (member.role === 'OWNER' || member.role === 'ADMIN');
  };

  const canAddCompany = () => {
    if (isGlobalAdmin) return true;
    if (companies.length === 0) return true;
    return companies.some((c) => {
      if (c.createdBy === userId) return true;
      const member = c.companyUsers?.find((cu) => cu.userId === userId);
      return member && (member.role === 'OWNER' || member.role === 'ADMIN');
    });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [managingCompany, setManagingCompany] = useState<Company | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRoundingMethod, setFormRoundingMethod] = useState('ITEM_ROUNDING');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const resetForm = () => {
    setFormName('');
    setFormTaxId('');
    setFormAddress('');
    setFormPhone('');
    setFormRoundingMethod('ITEM_ROUNDING');
    setEditingCompany(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormTaxId(company.taxId || '');
    setFormAddress(company.address || '');
    setFormPhone(company.phone || '');
    setFormRoundingMethod(company.roundingMethod || 'ITEM_ROUNDING');
    setDialogOpen(true);
  };

  const handleOpenDelete = (company: Company) => {
    setDeletingCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleOpenMembers = (company: Company) => {
    setManagingCompany(company);
    setMembersDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('กรุณากรอกชื่อบริษัท');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        taxId: formTaxId.trim() || undefined,
        address: formAddress.trim() || undefined,
        phone: formPhone.trim() || undefined,
        roundingMethod: formRoundingMethod,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
        toast.success('แก้ไขข้อมูลบริษัทสำเร็จ');
      } else {
        const newCompany = await createCompany(data);
        toast.success('เพิ่มบริษัทสำเร็จ');
        // Navigate to the new company's dashboard
        navigate(`/company/${newCompany.id}`);
      }
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;
    try {
      await deleteCompany(deletingCompany.id);
      toast.success(`ยกเลิกบริษัท "${deletingCompany.name}" สำเร็จ`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCompany(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader title="จัดการบริษัท" description="สร้าง แก้ไข หรือยกเลิกบริษัทของคุณ" />

      <div className="flex-1 space-y-6 p-4 overflow-auto min-h-0">
        {/* Header with Add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {companies.length} บริษัท
            </span>
          </div>
          {canAddCompany() && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              เพิ่มบริษัท
            </Button>
          )}
        </div>

        {/* Companies Table */}
        <Card className="bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">รายการบริษัท</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีบริษัท</p>
                <p className="text-sm mt-1">กดปุ่ม "เพิ่มบริษัท" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] py-2 h-9 text-xs">#</TableHead>
                      <TableHead className="py-2 h-9 text-xs">ชื่อบริษัท</TableHead>
                      <TableHead className="py-2 h-9 text-xs">เลขผู้เสียภาษี</TableHead>
                      <TableHead className="py-2 h-9 text-xs">ที่อยู่</TableHead>
                      <TableHead className="py-2 h-9 text-xs">เบอร์โทร</TableHead>
                      <TableHead className="py-2 h-9 text-xs text-center">สถานะ</TableHead>
                      <TableHead className="py-2 h-9 text-xs">ผู้สร้าง</TableHead>
                      <TableHead className="py-2 h-9 text-xs">วันที่สร้าง</TableHead>
                      <TableHead className="py-2 h-9 text-xs text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company, index) => (
                      <TableRow key={company.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground text-xs py-1.5 h-10">{index + 1}</TableCell>
                        <TableCell className="font-medium text-sm py-1.5 h-10">{company.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">
                          {company.taxId || '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground py-1.5 h-10" title={company.address || ''}>
                          {company.address || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">{company.phone || '-'}</TableCell>
                        <TableCell className="py-1.5 h-10 text-center">
                          {company.status === 'active' ? (
                            <Badge variant="success" className="text-[10px] w-20 justify-center shadow-none gap-1 pl-1.5">
                              <CheckCircle2 className="w-3 h-3" /> ใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] w-20 justify-center shadow-none gap-1 pl-1.5">
                              <Ban className="w-3 h-3" /> ยกเลิก
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">
                          {company.user?.name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 h-10">
                          {format(new Date(company.createdAt), 'd MMM yyyy', { locale: th })}
                        </TableCell>
                        <TableCell className="text-right py-1.5 h-10">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                if (isGlobalAdmin) {
                                  navigate(`/company/${company.id}`);
                                  return;
                                }
                                const member = company.companyUsers?.find((cu) => cu.userId === userId);
                                const role = member?.role;
                                if (role === 'DATA_ENTRY' || role === 'FINANCE') {
                                  navigate(`/company/${company.id}/transactions`);
                                } else {
                                  navigate(`/company/${company.id}`);
                                }
                              }}
                              className="gap-1 text-primary h-7 text-[10px]"
                            >
                              <ExternalLink className="h-3 w-3" />
                              เลือก
                            </Button>
                            {canManageCompany(company) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleOpenMembers(company)}
                                  className="gap-1 text-purple-600 hover:text-purple-700 h-7 text-[10px]"
                                >
                                  <Users className="h-3 w-3" />
                                  ทีมงาน
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleOpenEdit(company)}
                                  className="gap-1 h-7 text-[10px]"
                                >
                                  <Pencil className="h-3 w-3" />
                                  แก้ไข
                                </Button>
                                {company.status === 'active' && (
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => handleOpenDelete(company)}
                                    className="gap-1 text-destructive hover:text-destructive h-7 text-[10px]"
                                  >
                                    <Ban className="h-3 w-3" />
                                    ยกเลิก
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'แก้ไขบริษัท' : 'เพิ่มบริษัทใหม่'}</DialogTitle>
            <DialogDescription>
              {editingCompany
                ? 'แก้ไขข้อมูลบริษัทของคุณ'
                : 'กรอกข้อมูลบริษัทที่ต้องการเพิ่ม'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">
                ชื่อบริษัท <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-name"
                className="bg-warning/15 border-warning/30 dark:bg-warning/20 dark:border-warning/40 focus-visible:ring-warning/50"
                placeholder="ชื่อบริษัท"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-tax-id">เลขผู้เสียภาษี</Label>
              <Input
                id="company-tax-id"
                placeholder="เลขผู้เสียภาษี 13 หลัก"
                value={formTaxId}
                onChange={(e) => setFormTaxId(e.target.value)}
                maxLength={13}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-address">ที่อยู่</Label>
              <Input
                id="company-address"
                placeholder="ที่อยู่บริษัท"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-phone">เบอร์โทร</Label>
              <Input
                id="company-phone"
                placeholder="เบอร์โทร"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-rounding-method">วิธีการปัดเศษทศนิยม (Rounding Method)</Label>
              <Select
                value={formRoundingMethod}
                onValueChange={setFormRoundingMethod}
              >
                <SelectTrigger id="company-rounding-method">
                  <SelectValue placeholder="เลือกวิธีการคำนวณและปัดเศษ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ITEM_ROUNDING">
                    ปัดเศษทศนิยมแยกรายชิ้น (Item-by-Item Rounding)
                  </SelectItem>
                  <SelectItem value="TOTAL_ROUNDING">
                    คำนวณจากยอดรวม (Total Rounding)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCompany ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompanyMembersDialog
        companyId={managingCompany?.id || null}
        companyName={managingCompany?.name || ''}
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิกบริษัท</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยกเลิกบริษัท <strong>"{deletingCompany?.name}"</strong> ใช่หรือไม่?
              <br />
              <span className="text-muted-foreground text-xs mt-2 block">
                บริษัทจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" และจะไม่แสดงในรายการ
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ใช่</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ยืนยันยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
