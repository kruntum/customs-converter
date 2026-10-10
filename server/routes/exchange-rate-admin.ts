import { Hono } from 'hono';
import { getExchangeRateSyncConfig, setConfig } from '../services/system-config.js';
import { runDailyExchangeRateSync } from '../services/exchange-rate-sync.js';
import { prisma } from '../db.js';

const exchangeRateAdminRoutes = new Hono();

/**
 * GET /api/admin/exchange-rate-config
 * ดึง config ปัจจุบันและสถิติจาก DB
 * (admin only — protected by adminMiddleware ใน index.ts)
 */
exchangeRateAdminRoutes.get('/exchange-rate-config', async (c) => {
    const [config, totalRates] = await Promise.all([
        getExchangeRateSyncConfig(),
        prisma.exchangeRate.count(),
    ]);

    // คำนวณเวลา sync ถัดไป
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(config.syncHour, 0, 0, 0);
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

    return c.json({
        data: {
            syncHour: config.syncHour,
            enabled: config.enabled,
            lastSyncAt: config.lastSyncAt,
            lastStatus: config.lastStatus,
            lastRecords: config.lastRecords,
            lastError: config.lastError,
            nextSyncAt: nextRun.toISOString(),
            totalRates,
        },
    });
});

/**
 * PUT /api/admin/exchange-rate-config
 * บันทึก config ใหม่ (syncHour, enabled)
 */
exchangeRateAdminRoutes.put('/exchange-rate-config', async (c) => {
    const body = await c.req.json<{ syncHour?: number; enabled?: boolean }>();

    const updates: Promise<void>[] = [];

    if (typeof body.syncHour === 'number') {
        if (body.syncHour < 0 || body.syncHour > 23) {
            return c.json({ error: 'syncHour ต้องอยู่ระหว่าง 0-23' }, 400);
        }
        updates.push(setConfig('exchange_rate_sync_hour', String(body.syncHour)));
    }

    if (typeof body.enabled === 'boolean') {
        updates.push(setConfig('exchange_rate_sync_enabled', body.enabled ? 'true' : 'false'));
    }

    if (updates.length === 0) {
        return c.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, 400);
    }

    await Promise.all(updates);

    return c.json({ message: 'บันทึกการตั้งค่าสำเร็จ' });
});

/**
 * POST /api/admin/exchange-rate-config/sync-now
 * สั่ง sync ทันที (ไม่รอ cron)
 * ตอบ 202 ก่อนแล้วรันใน background
 */
exchangeRateAdminRoutes.post('/exchange-rate-config/sync-now', async (c) => {
    console.log('[ExchangeRateSync] 🔧 Triggered manually by admin');
    runDailyExchangeRateSync().catch(console.error);
    return c.json({ message: 'กำลัง sync ใน background' }, 202);
});

export default exchangeRateAdminRoutes;
