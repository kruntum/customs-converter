import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
    Settings, RefreshCw, Database, Clock, CheckCircle2,
    XCircle, AlertTriangle, Loader2, Play, Save, Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface SyncConfig {
    syncHour: number;
    enabled: boolean;
    lastSyncAt: string | null;
    lastStatus: 'idle' | 'running' | 'success' | 'partial' | 'error';
    lastRecords: number;
    lastError?: string | null;
    nextSyncAt: string;
    totalRates: number;
}

const STATUS_CONFIG = {
    idle: { label: 'รอดำเนินการ', icon: Clock, className: 'text-muted-foreground bg-muted' },
    running: { label: 'กำลัง sync...', icon: Loader2, className: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40' },
    success: { label: 'สำเร็จ', icon: CheckCircle2, className: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40' },
    partial: { label: 'สำเร็จบางส่วน', icon: AlertTriangle, className: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40' },
    error: { label: 'เกิดข้อผิดพลาด', icon: XCircle, className: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40' },
};

const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];
const CURRENCY_COLORS: Record<string, string> = {
    USD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    EUR: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    CNY: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    JPY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    GBP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

export default function ExchangeRateSettingsPage() {
    const [config, setConfig] = useState<SyncConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // local editable state
    const [syncHour, setSyncHour] = useState(18);
    const [enabled, setEnabled] = useState(true);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/exchange-rate-config', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setConfig(json.data);
            setSyncHour(json.data.syncHour);
            setEnabled(json.data.enabled);
        } catch {
            toast.error('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // auto-refresh ทุก 5 วินาที เฉพาะตอนที่สถานะกำลังรัน (running) เพื่ออัปเดตสถานะเป็นสำเร็จ/ล้มเหลวโดยอัตโนมัติ
    useEffect(() => {
        if (config?.lastStatus === 'running') {
            const interval = setInterval(fetchConfig, 5000);
            return () => clearInterval(interval);
        }
    }, [config?.lastStatus, fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/exchange-rate-config', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ syncHour, enabled }),
            });
            if (!res.ok) throw new Error('Failed to save');
            toast.success('บันทึกการตั้งค่าสำเร็จ');
            await fetchConfig();
        } catch {
            toast.error('ไม่สามารถบันทึกการตั้งค่าได้');
        } finally {
            setSaving(false);
        }
    };

    const handleSyncNow = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/exchange-rate-config/sync-now', {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to trigger');
            toast.success('เริ่ม sync ใน background แล้ว — รอสักครู่...');
            // รอ 2 วิแล้ว refresh สถานะ
            setTimeout(fetchConfig, 2000);
        } catch {
            toast.error('ไม่สามารถสั่ง sync ได้');
        } finally {
            setSyncing(false);
        }
    };

    const hasChanges = config && (syncHour !== config.syncHour || enabled !== config.enabled);

    const StatusBadge = ({ status }: { status: SyncConfig['lastStatus'] }) => {
        const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
        const Icon = s.icon;
        return (
            <Badge variant="secondary" className={`gap-1.5 text-xs font-medium ${s.className}`}>
                <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
                {s.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full min-h-0">
                <PageHeader title="ตั้งค่า Exchange Rate Auto Sync" description="สำหรับ Admin เท่านั้น" />
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full min-h-0">
            <PageHeader
                title="ตั้งค่า Exchange Rate Auto Sync"
                description="กำหนดเวลาดึงข้อมูลอัตราแลกเปลี่ยนอัตโนมัติจาก BOT API"
            />

            <div className="flex-1 p-4 space-y-4 overflow-auto">

                {/* Status Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'ข้อมูลในฐานข้อมูล',
                            value: config?.totalRates.toLocaleString() ?? '—',
                            sub: 'records ทั้งหมด',
                            icon: Database,
                            color: 'text-primary',
                        },
                        {
                            label: 'สถานะล่าสุด',
                            value: <StatusBadge status={config?.lastStatus ?? 'idle'} />,
                            sub: config?.lastRecords ? `${config.lastRecords} records` : '—',
                            icon: CheckCircle2,
                            color: 'text-emerald-500',
                        },
                        {
                            label: 'Sync ครั้งล่าสุด',
                            value: config?.lastSyncAt
                                ? format(new Date(config.lastSyncAt), 'd MMM yyyy HH:mm', { locale: th })
                                : 'ยังไม่เคย sync',
                            sub: 'เวลา server',
                            icon: Clock,
                            color: 'text-amber-500',
                        },
                        {
                            label: 'Sync ถัดไป',
                            value: config?.enabled && config?.nextSyncAt
                                ? format(new Date(config.nextSyncAt), 'd MMM yyyy HH:mm', { locale: th })
                                : 'ปิดใช้งาน',
                            sub: `${syncHour}:00 น.`,
                            icon: RefreshCw,
                            color: 'text-blue-500',
                        },
                    ].map((item) => (
                        <Card key={item.label} className="bg-muted/40">
                            <CardContent className="pt-4 pb-3 px-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                                    <span className="text-xs text-muted-foreground">{item.label}</span>
                                </div>
                                <div className="text-sm font-semibold">{item.value}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Error alert banner if sync failed */}
                {config?.lastError && (
                    <Card className="border-destructive/40 bg-destructive/10 dark:bg-destructive/15">
                        <CardContent className="pt-3 pb-3 px-4 flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-0.5 text-xs">
                                <p className="font-semibold text-destructive">
                                    รายละเอียดข้อผิดพลาดจากการ Sync ล่าสุด:
                                </p>
                                <p className="text-muted-foreground text-[11px] break-all">
                                    {config.lastError}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Settings Card */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            การตั้งค่า Auto Sync
                        </CardTitle>
                        <CardDescription className="text-xs">
                            ระบบจะดึงข้อมูล 7 วันล่าสุดจาก BOT API ทุกวันตามเวลาที่กำหนด
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">

                        {/* Enable/Disable toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Power className="h-3.5 w-3.5" />
                                    เปิดใช้งาน Auto Sync
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    ถ้าปิด ระบบจะไม่ดึงข้อมูลอัตโนมัติ (ยังสามารถ Sync ด้วยมือได้)
                                </p>
                            </div>
                            <Switch
                                checked={enabled}
                                onCheckedChange={setEnabled}
                            />
                        </div>

                        {/* Sync hour */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                เวลา sync อัตโนมัติ
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                BOT อัปเดตอัตราแลกเปลี่ยนราว 11:00–12:00 น. แนะนำให้ตั้งช่วง 16:00–18:00 น.
                            </p>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={String(syncHour)}
                                    onValueChange={(v) => setSyncHour(Number(v))}
                                    disabled={!enabled}
                                >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <SelectItem key={i} value={String(i)} className="text-xs">
                                                {String(i).padStart(2, '0')}:00 น.
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground">ทุกวัน</span>
                            </div>
                        </div>

                        <Separator />

                        {/* Covered currencies */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">สกุลเงินที่ sync</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {CURRENCIES.map(c => (
                                    <Badge
                                        key={c}
                                        variant="secondary"
                                        className={`text-xs font-semibold ${CURRENCY_COLORS[c]}`}
                                    >
                                        {c}
                                    </Badge>
                                ))}
                                <Badge variant="secondary" className="text-xs text-muted-foreground">
                                    KRW — ไม่มีข้อมูลใน BOT API
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                ดึงข้อมูลย้อนหลัง 7 วัน × 5 สกุล = <span className="font-semibold">5 API calls / วัน</span>{' '}
                                (ลิมิต BOT: 200 calls/ชั่วโมง)
                            </p>
                        </div>

                        <Separator />

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                size="sm"
                                className="gap-1.5"
                            >
                                {saving
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Save className="h-3.5 w-3.5" />
                                }
                                บันทึกการตั้งค่า
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleSyncNow}
                                disabled={syncing || config?.lastStatus === 'running'}
                                size="sm"
                                className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                            >
                                {syncing || config?.lastStatus === 'running'
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Play className="h-3.5 w-3.5" />
                                }
                                Sync ทันที
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={fetchConfig}
                                size="sm"
                                className="gap-1.5 text-muted-foreground ml-auto"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                รีเฟรชสถานะ
                            </Button>
                        </div>

                        {hasChanges && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                ⚠️ มีการเปลี่ยนแปลงที่ยังไม่บันทึก — Cron ถัดไปจะใช้เวลาใหม่หลังจากบันทึกแล้ว
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Info box */}
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">วิธีทำงาน:</span>{' '}
                            เมื่อถึงเวลาที่กำหนด server จะดึงข้อมูล <span className="font-medium">7 วันล่าสุด</span> สำหรับทุกสกุลเงิน
                            แล้ว Upsert เข้า DB (ข้อมูลซ้ำจะถูกอัปเดต ไม่สร้างซ้ำ){' '}
                            เหตุที่ fetch 7 วัน เพราะ BOT ไม่ออกเรทวันเสาร์-อาทิตย์และวันหยุดราชการ
                            การ Sync จะทำงานต่อเนื่องหลัง server restart โดยอัตโนมัติ
                        </p>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
