import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/use-role';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '@/stores/dashboard-store';
import { useSession } from '@/lib/auth-client';
import { formatNumber } from '@/lib/utils';
import { AlertCircle, ArrowRight, Loader2, Users, CalendarDays, Filter } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');

  const navigate = useNavigate();
  const { hasRole, isLoading: roleLoading } = useRole(['OWNER', 'ADMIN', 'FINANCE']);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const { stats, fetchStats, loading, error } = useDashboardStore();

  useEffect(() => {
    if (!roleLoading && !hasRole && cId) {
      navigate(`/company/${cId}/transactions`, { replace: true });
    }
  }, [roleLoading, hasRole, cId, navigate]);

  useEffect(() => {
    if (cId && !roleLoading && hasRole) {
      const year = parseInt(selectedYear);
      const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
      fetchStats(cId, year, month);
    }
  }, [cId, selectedYear, selectedMonth, fetchStats, roleLoading, hasRole]);

  if (roleLoading) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!hasRole) return null;

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">กำลังโหลดข้อมูลสรุปผล...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex flex-col h-full items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">ไม่สามารถโหลดข้อมูลได้</h2>
        <p className="text-red-600/80 dark:text-red-400/80 max-w-md">{error || "ตรวจสอบสิทธิ์การใช้งานของคุณ"}</p>
      </div>
    );
  }

  // Monthly THB trend data
  const allMonths = Object.keys(stats.thbByMonth).sort();
  const monthlyData = allMonths.map(month => ({
    name: month,
    "ยอด THB": stats.thbByMonth[month] || 0,
  }));

  // Currency breakdown pie
  const currencyPieData = Object.entries(stats.thbByCurrency)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader
        title="Dashboard"
        description={`สรุปภาพรวมรายการใบขนสินค้าของ ${session?.user?.name || 'บริษัท'}`}
      />

      <div className="flex-1 flex flex-col gap-4 p-2 md:p-4 overflow-auto min-h-0">

        {/* Filters */}
        <div className="flex items-center justify-end shrink-0">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <Filter className="h-4 w-4 text-muted-foreground ml-2" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                <CalendarDays className="mr-2 h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="ปี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={(currentYear).toString()}>{currentYear}</SelectItem>
                <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                <SelectItem value={(currentYear - 2).toString()}>{currentYear - 2}</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[120px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="เดือน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งปี (All)</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {format(new Date(2000, m - 1, 1), 'MMMM', { locale: th })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-7 shrink-0">
          <Card className="md:col-span-5 shadow-sm flex flex-col">
            <CardHeader className="pb-0 pt-3">
              <CardTitle className="text-sm">ยอดรายการรายเดือน (THB)</CardTitle>
              <CardDescription className="text-[10px]">มูลค่ารวมใบขนสินค้าแยกตามเดือน</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              {monthlyData.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} style={{ fontSize: '11px', fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${formatNumber(value / 1000)}k`} style={{ fontSize: '11px', fill: '#6B7280' }} />
                      <RechartsTooltip
                        formatter={(value: any) => [`฿${formatNumber(Number(value))}`, undefined]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        cursor={{ fill: '#f1f5f9' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                      <Bar dataKey="ยอด THB" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
                  ยังไม่มีข้อมูลทำรายการ
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm flex flex-col">
            <CardHeader className="pb-0 pt-3">
              <CardTitle className="text-sm">สัดส่วนสกุลเงิน</CardTitle>
              <CardDescription className="text-[10px]">มูลค่า THB แยกตามสกุลเงิน</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              {currencyPieData.length > 0 ? (
                <div className="h-[200px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={currencyPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                        {currencyPieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`฿${formatNumber(Number(value))}`, name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg text-sm">
                  ยังไม่มีข้อมูล
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom: Top Customers + Outstanding */}
        <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-[250px]">

          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b border-border/40 mb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                Top 5 ลูกค้าที่มียอดรายการสูงสุด
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-3 text-sm overflow-auto">
              {stats.topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {stats.topCustomers.slice(0, 5).map((customer, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold text-xs">
                          #{i + 1}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{customer.name}</span>
                      </div>
                      <div className="font-semibold text-primary">
                        ฿{formatNumber(Math.abs(customer.gain))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-xs">ไม่พบข้อมูลลูกค้า</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm flex flex-col bg-muted/50 rounded-xl border">
            <CardHeader className="pb-2 border-b border-border/40 mb-2 bg-orange-50/10 dark:bg-orange-950/20 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                <Users className="h-4 w-4" />
                รายการล่าสุด (Outstanding Receivables)
              </CardTitle>
              <CardDescription className="text-[10px] text-orange-600/70 dark:text-orange-400/70">
                รายการใบขนสินค้าเรียงตามอายุ
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 px-0 pb-0 overflow-auto">
              {stats.unpaidInvoices.length > 0 ? (
                <div className="h-full overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-left font-medium px-4 py-1.5 h-8 text-[11px]">ลูกค้า / Invoice</TableHead>
                        <TableHead className="text-right font-medium px-4 py-1.5 h-8 text-[11px]">ยอด (FCY)</TableHead>
                        <TableHead className="text-right font-medium px-4 py-1.5 h-8 text-[11px] w-[80px]">อายุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.unpaidInvoices.slice(0, 5).map(inv => (
                        <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-4 py-1.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</div>
                            <div className="text-[10px] text-muted-foreground flex gap-2 items-center mt-0.5">
                              <span>{inv.invoiceNumber}</span>
                              <span>•</span>
                              <span>{format(new Date(inv.invoiceDate), 'dd MMM yyyy', { locale: th })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-1.5 text-right">
                            <div className="font-mono font-medium">{formatNumber(inv.pendingFcy, 2)} <span className="text-[10px] text-muted-foreground">{inv.currencyCode}</span></div>
                            <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">~฿{formatNumber(inv.estimatedThbValue)}</div>
                          </TableCell>
                          <TableCell className="px-4 py-1.5 text-right">
                            <Badge variant={inv.agingDays > 30 ? "destructive" : "secondary"} className="text-[10px] w-14 justify-center shadow-none py-0 font-normal">
                              {inv.agingDays} วัน
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground flex flex-col items-center">
                  <span className="text-3xl mb-1">🎉</span>
                  <span className="text-xs">ไม่มีรายการค้างชำระ</span>
                </div>
              )}
              {stats.totalUnpaidCount >= 5 && (
                <div className="p-3 border-t bg-muted/10 text-center shrink-0">
                  <Link to={`/company/${cId}/transactions`} className="text-xs text-primary hover:underline font-medium flex items-center justify-center gap-1">
                    ดูรายการทั้งหมด ({stats.totalUnpaidCount}) <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
