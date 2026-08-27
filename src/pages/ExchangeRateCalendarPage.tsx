import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { TrendingUp, TrendingDown, RefreshCw, Database, Filter, CalendarDays, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PageHeader } from '@/components/page-header';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

interface ExchangeRateRecord {
    id: number;
    currencyCode: string;
    rateDate: string;
    buyingTransfer: string;
    selling: string | null;
    createdAt: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD — ดอลลาร์สหรัฐ' },
    { value: 'EUR', label: 'EUR — ยูโร' },
    { value: 'CNY', label: 'CNY — หยวนจีน' },
    { value: 'JPY', label: 'JPY — เยนญี่ปุ่น' },
    { value: 'GBP', label: 'GBP — ปอนด์อังกฤษ' },
];

const CURRENCY_COLORS: Record<string, string> = {
    USD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    EUR: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    CNY: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    JPY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    GBP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i);

const LIMIT_OPTIONS = [50, 100, 200];

export default function ExchangeRateCalendarPage() {
    const [rates, setRates] = useState<ExchangeRateRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 100, totalPages: 1 });
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterCurrency, setFilterCurrency] = useState('all');
    const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
    const [filterMonth, setFilterMonth] = useState('all');
    const [limit, setLimit] = useState(100);
    const [page, setPage] = useState(1);
    const [yearOpen, setYearOpen] = useState(false);

    const buildDateRange = () => {
        const year = filterYear ? parseInt(filterYear) : null;
        const month = filterMonth !== 'all' ? parseInt(filterMonth) : null;

        if (year && month) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0); // last day of month
            return {
                start: format(start, 'yyyy-MM-dd'),
                end: format(end, 'yyyy-MM-dd'),
            };
        } else if (year) {
            return {
                start: `${year}-01-01`,
                end: `${year}-12-31`,
            };
        }
        return { start: '', end: '' };
    };

    const fetchRates = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const { start, end } = buildDateRange();
            const params = new URLSearchParams({
                page: targetPage.toString(),
                limit: limit.toString(),
            });
            if (filterCurrency !== 'all') params.set('currency', filterCurrency);
            if (start) params.set('start', start);
            if (end) params.set('end', end);

            const res = await fetch(`/api/rates/calendar?${params.toString()}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setRates(json.data);
            setPagination(json.pagination);
        } catch {
            toast.error('ไม่สามารถดึงข้อมูลอัตราแลกเปลี่ยนได้');
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterCurrency, filterYear, filterMonth, limit, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filterCurrency, filterYear, filterMonth, limit]);

    useEffect(() => {
        fetchRates(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterCurrency, filterYear, filterMonth, limit, page]);

    const hasActiveFilter = filterCurrency !== 'all' || filterYear !== '' || filterMonth !== 'all';

    const clearFilters = () => {
        setFilterCurrency('all');
        setFilterYear(String(new Date().getFullYear()));
        setFilterMonth('all');
        setPage(1);
    };

    const { start, end } = buildDateRange();

    return (
        <div className="flex-1 flex flex-col h-full min-h-0">
            <PageHeader
                title="ปฏิทินอัตราแลกเปลี่ยน (BOT)"
                description="ข้อมูลอัตราซื้อ Buying Transfer จากธนาคารแห่งประเทศไทย เก็บในฐานข้อมูลภายใน"
            />

            <div className="flex-1 flex flex-col space-y-4 p-4 min-h-0 overflow-hidden">

                {/* Filter bar */}
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

                        {/* Currency filter */}
                        <Select value={filterCurrency} onValueChange={(v) => { setFilterCurrency(v); setPage(1); }}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="สกุลเงินทั้งหมด" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">สกุลเงินทั้งหมด</SelectItem>
                                {CURRENCY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Year filter (combobox) */}
                        <Popover open={yearOpen} onOpenChange={setYearOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={yearOpen}
                                    className="w-[110px] h-8 text-xs justify-between font-normal"
                                >
                                    {filterYear || 'ปีทั้งหมด'}
                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[140px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="พิมพ์ปี..." className="h-8 text-xs" />
                                    <CommandList>
                                        <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">ไม่พบปี</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem value="" onSelect={() => { setFilterYear(''); setYearOpen(false); setPage(1); }} className="text-xs">
                                                <Check className={`mr-1 h-3 w-3 ${!filterYear ? 'opacity-100' : 'opacity-0'}`} />
                                                ปีทั้งหมด
                                            </CommandItem>
                                            {YEAR_OPTIONS.map((y) => (
                                                <CommandItem key={y} value={String(y)} onSelect={() => { setFilterYear(String(y)); setYearOpen(false); setPage(1); }} className="text-xs">
                                                    <Check className={`mr-1 h-3 w-3 ${filterYear === String(y) ? 'opacity-100' : 'opacity-0'}`} />
                                                    {y}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Month filter */}
                        <Select value={filterMonth} onValueChange={(v) => { setFilterMonth(v); setPage(1); }}>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="เดือนทั้งหมด" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">เดือนทั้งหมด</SelectItem>
                                {MONTH_NAMES.map((name, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)} className="text-xs">{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Rows per page */}
                        <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LIMIT_OPTIONS.map(l => (
                                    <SelectItem key={l} value={String(l)} className="text-xs">{l} แถว</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Clear filter */}
                        {hasActiveFilter && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                onClick={clearFilters}
                            >
                                ล้างตัวกรอง
                            </Button>
                        )}

                        {/* Stats */}
                        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                            {start && end && (
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {format(new Date(start), 'd MMM yyyy', { locale: th })}
                                    {' – '}
                                    {format(new Date(end), 'd MMM yyyy', { locale: th })}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Database className="h-3.5 w-3.5" />
                                {pagination.total.toLocaleString()} รายการ
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => fetchRates(page)}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                                รีเฟรช
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Card with table */}
                <Card className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/50 rounded-xl border shadow-sm">
                    <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : rates.length === 0 ? (
                            <EmptyState
                                icon={Database}
                                title="ไม่พบข้อมูลในช่วงเวลาที่เลือก"
                            />
                        ) : (
                            <>
                                <div className="flex-1 overflow-auto rounded-md min-h-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="w-10 text-center font-medium text-xs">#</TableHead>
                                                <TableHead className="font-medium text-xs">วันที่</TableHead>
                                                <TableHead className="font-medium text-xs">สกุลเงิน</TableHead>
                                                <TableHead className="font-medium text-xs text-right">
                                                    <span className="flex items-center justify-end gap-1">
                                                        <TrendingUp className="h-3 w-3" />
                                                        อัตราซื้อ (Buying Transfer)
                                                    </span>
                                                </TableHead>
                                                <TableHead className="font-medium text-xs text-right">
                                                    <span className="flex items-center justify-end gap-1">
                                                        <TrendingDown className="h-3 w-3" />
                                                        อัตราขาย (Selling)
                                                    </span>
                                                </TableHead>
                                                <TableHead className="font-medium text-xs text-right">หน่วย</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rates.map((r, idx) => {
                                                const colorClass = CURRENCY_COLORS[r.currencyCode] ?? 'bg-muted text-muted-foreground';
                                                const rowNum = (pagination.page - 1) * pagination.limit + idx + 1;
                                                return (
                                                    <TableRow key={r.id} className="hover:bg-muted/30">
                                                        <TableCell className="text-center text-muted-foreground text-xs py-1">
                                                            {rowNum}
                                                        </TableCell>
                                                        <TableCell className="font-mono tabular-nums text-xs py-1">
                                                            {format(new Date(r.rateDate), 'd MMM yyyy', { locale: th })}
                                                        </TableCell>
                                                        <TableCell className="py-1">
                                                            <Badge
                                                                variant="secondary"
                                                                className={`text-[10px] font-semibold px-1.5 py-0 ${colorClass}`}
                                                            >
                                                                {r.currencyCode}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums font-medium text-xs py-1">
                                                            {parseFloat(r.buyingTransfer).toFixed(4)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono tabular-nums font-medium text-xs py-1">
                                                            {r.selling ? parseFloat(r.selling).toFixed(4) : <span className="text-muted-foreground">—</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground text-xs py-1">
                                                            บาท / 1 {r.currencyCode}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination inside card */}
                                <div className="pt-3 shrink-0">
                                    <DataTablePagination
                                        total={pagination.total}
                                        page={pagination.page}
                                        perPage={pagination.limit}
                                        onPageChange={(p) => setPage(p)}
                                        onPerPageChange={(l) => { setLimit(l); setPage(1); }}
                                        perPageOptions={LIMIT_OPTIONS}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
