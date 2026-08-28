import * as React from "react"
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Coins,
  UserSquare2,
  History,
  FileSpreadsheet,
  CalendarDays,
  Settings2,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { CompanySwitcher } from "@/components/company-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Link, useLocation, useParams } from "react-router-dom"
import { useSession } from "@/lib/auth-client"
import { RoleProtect } from "@/components/role-protect"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { companyId: urlCompanyId } = useParams()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  // Save last active company ID to local storage if present in URL
  React.useEffect(() => {
    if (urlCompanyId) {
      localStorage.setItem('lastActiveCompanyId', urlCompanyId);
    }
  }, [urlCompanyId]);

  const effectiveCompanyId = urlCompanyId || localStorage.getItem('lastActiveCompanyId');

  // Company-scoped navigation items
  const navItems: { title: string; url: string; icon: React.ComponentType<any>; allowedRoles?: string[]; exact?: boolean }[] = effectiveCompanyId
    ? [
        { title: "แดชบอร์ด", url: `/company/${effectiveCompanyId}`, icon: LayoutDashboard, allowedRoles: ["OWNER", "ADMIN", "FINANCE"], exact: true },
        { title: "ลูกค้า", url: `/company/${effectiveCompanyId}/customers`, icon: UserSquare2 },
        { title: "รายการ (Transactions)", url: `/company/${effectiveCompanyId}/transactions`, icon: FileText },
        { title: "นำเข้าใบขน Excel", url: `/company/${effectiveCompanyId}/import-transactions`, icon: FileSpreadsheet, allowedRoles: ["OWNER", "ADMIN", "DATA_ENTRY"] },
        { title: "ปฏิทินอัตราแลกเปลี่ยน", url: `/company/${effectiveCompanyId}/exchange-rates`, icon: CalendarDays },
        ...(isAdmin ? [
          { title: "ผู้ใช้", url: "/admin/users", icon: Users },
          { title: "สกุลเงิน", url: "/admin/currencies", icon: Coins },
          { title: "ตั้งค่า Auto Sync", url: "/admin/exchange-rates", icon: Settings2 },
        ] : []),
      ]
    : [
        { title: "บริษัท", url: "/companies", icon: Building2 },
        ...(isAdmin ? [
          { title: "ผู้ใช้", url: "/admin/users", icon: Users },
          { title: "สกุลเงิน", url: "/admin/currencies", icon: Coins },
          { title: "ตั้งค่า Auto Sync", url: "/admin/exchange-rates", icon: Settings2 },
        ] : []),
      ];

  const userStub = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const content = (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.exact ? location.pathname === item.url : (item.url === '/' ? location.pathname === item.url : location.pathname.startsWith(item.url))} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );

              if (item.allowedRoles) {
                return (
                  <RoleProtect key={item.title} allowedRoles={item.allowedRoles}>
                    {content}
                  </RoleProtect>
                );
              }

              return content;
            })}
            {effectiveCompanyId && (
                <RoleProtect allowedRoles={['OWNER', 'ADMIN']}>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location.pathname === `/company/${effectiveCompanyId}/audit-logs`} tooltip="ประวัติการแก้ไข">
                            <Link to={`/company/${effectiveCompanyId}/audit-logs`}>
                                <History />
                                <span>ประวัติข้อมูล (Audit)</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </RoleProtect>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
         <NavUser user={userStub} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
