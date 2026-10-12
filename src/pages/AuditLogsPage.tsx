import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuditStore } from '@/stores/audit-store';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, History, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AuditLogsPage() {
  const { companyId } = useParams();
  const cId = parseInt(companyId || '0');
  
  const { logs, pagination, loading, error, fetchLogs } = useAuditStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (cId) {
      fetchLogs(cId, { page, search: searchQuery });
    }
  }, [cId, page, fetchLogs]); // Note: intentionall not adding searchQuery to avoid fetching on every keystroke

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchLogs(cId, { page: 1, search: searchQuery });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (!pagination || newPage <= pagination.totalPages)) {
      setPage(newPage);
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-950/20">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Access Denied</h2>
        <p className="text-red-600/80 dark:text-red-400/80 max-w-md">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <PageHeader 
        title="Audit Logs (ประวัติการแก้ไขข้อมูล)" 
        description="ตรวจสอบประวัติการทำรายการ การเพิ่ม หรือแก้ไขข้อมูลสำคัญภายในระบบ สงวนสิทธิ์เฉพาะผู้ดูแลระบบ" 
      />

      <div className="flex-1 space-y-4 p-4 overflow-auto min-h-0">
        <Card className="flex flex-col min-h-[500px] bg-muted/50 rounded-xl border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-blue-500" />
                  Activity History
                </CardTitle>
                <CardDescription>
                  แสดงประวัติการเปลี่ยนแปลงข้อมูลล่าสุดจากผู้ใช้งานทั้งหมดในบริษัท
                </CardDescription>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="ค้นหา (ผู้ใช้, action, entity)..."
                    className="pl-8 h-9 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" size="sm" className="h-9">ค้นหา</Button>
              </form>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[140px] whitespace-nowrap py-1.5 h-8 text-xs">วันเวลา</TableHead>
                  <TableHead className="w-[180px] py-1.5 h-8 text-xs">ผู้ใช้งาน (Email)</TableHead>
                  <TableHead className="w-[140px] py-1.5 h-8 text-xs">สิ่งที่ทำ</TableHead>
                  <TableHead className="w-[140px] py-1.5 h-8 text-xs">หมวดหมู่ (ID)</TableHead>
                  <TableHead className="min-w-[300px] py-1.5 h-8 text-xs">รายละเอียด (Changes)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      ไม่พบประวัติการแก้ไขข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="text-muted-foreground whitespace-nowrap align-top py-2">
                        {format(new Date(log.createdAt), 'dd MMM yy HH:mm', { locale: th })}
                      </TableCell>
                      <TableCell className="align-top py-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{log.user.name || 'Unknown User'}</div>
                        <div className="text-[10px] text-muted-foreground">{log.user.email}</div>
                      </TableCell>
                      <TableCell className="align-top py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-100 dark:border-blue-800 shadow-xs">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="align-top py-2">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{log.entity}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">ID: {log.entityId}</div>
                      </TableCell>
                      <TableCell className="align-top py-2">
                         <div className="space-y-1.5 max-w-2xl overflow-x-auto">
                            {log.oldValues && (
                                <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded p-1.5 text-[10px]">
                                    <span className="text-rose-600 dark:text-rose-400 font-bold mb-0.5 block">Old:</span>
                                    <pre className="text-rose-800 dark:text-rose-300/80 overflow-hidden whitespace-pre-wrap leading-tight font-sans">{JSON.stringify(log.oldValues, null, 2)}</pre>
                                </div>
                            )}
                            {log.newValues && (
                                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded p-1.5 text-[10px]">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold mb-0.5 block">New:</span>
                                    <pre className="text-emerald-800 dark:text-emerald-300/80 overflow-hidden whitespace-pre-wrap leading-tight font-sans">{JSON.stringify(log.newValues, null, 2)}</pre>
                                </div>
                            )}
                            {!log.oldValues && !log.newValues && (
                                <span className="text-muted-foreground italic text-[10px]">No detail recorded.</span>
                            )}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination Footer */}
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-border/40 p-4 flex items-center justify-between bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1.5 px-2">
                    <span className="text-sm font-medium">{page}</span>
                    <span className="text-sm text-muted-foreground">/ {pagination.totalPages}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
