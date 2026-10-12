import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanyStore, type Company } from '@/stores/company-store';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSession } from '@/lib/auth-client';

export function CompanySwitcher() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { companyId: urlCompanyId } = useParams();
  const { companies, fetchCompanies } = useCompanyStore();
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const globalRole = (session?.user as { role?: string } | undefined)?.role;
  const isGlobalAdmin = globalRole === 'admin';

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const effectiveCompanyId = urlCompanyId || localStorage.getItem('lastActiveCompanyId');

  // Set active company based on URL param or local storage
  useEffect(() => {
    if (effectiveCompanyId && companies.length > 0) {
      const found = companies.find((c) => c.id === parseInt(effectiveCompanyId));
      if (found) setActiveCompany(found);
    }
  }, [effectiveCompanyId, companies]);

  const handleSelectCompany = (company: Company) => {
    setActiveCompany(company);
    
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
  };

  const canAddCompany = isGlobalAdmin || companies.some((c) => {
    if (c.createdBy === userId) return true;
    const member = c.companyUsers?.find((cu) => cu.userId === userId);
    return member && (member.role === 'OWNER' || member.role === 'ADMIN');
  });

  const handleManageCompanies = () => {
    navigate('/companies');
  };

  if (companies.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          {canAddCompany ? (
            <SidebarMenuButton
              size="lg"
              onClick={handleManageCompanies}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plus className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">สร้างบริษัท</span>
                <span className="truncate text-xs text-muted-foreground">เริ่มต้นใช้งาน</span>
              </div>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              size="lg"
              onClick={handleManageCompanies}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">ยังไม่มีบริษัท</span>
                <span className="truncate text-xs text-muted-foreground">รอผู้ดูแลระบบมอบหมาย</span>
              </div>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeCompany?.name || 'เลือกบริษัท'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeCompany?.taxId || 'Currency Declaration'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              บริษัทของคุณ
            </DropdownMenuLabel>
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">{company.name}</div>
                  {company.taxId && (
                    <div className="text-xs text-muted-foreground">{company.taxId}</div>
                  )}
                </div>
                {activeCompany?.id === company.id && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleManageCompanies}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Building2 className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">จัดการบริษัท</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
