/**
 * System Config Service
 * =====================
 * Helper สำหรับอ่าน/เขียน SystemConfig จาก DB
 *
 * Keys ที่ใช้ในระบบ exchange rate sync:
 *   exchange_rate_sync_hour     → ชั่วโมงที่รัน sync (0-23, default 18)
 *   exchange_rate_sync_enabled  → เปิด/ปิด auto sync ("true"/"false")
 *   exchange_rate_last_sync_at  → เวลา sync ล่าสุด (ISO string)
 *   exchange_rate_last_status   → ผลลัพธ์ล่าสุด ("idle"/"running"/"success"/"error")
 *   exchange_rate_last_records  → จำนวน records ที่ sync ได้ล่าสุด
 */

import { prisma } from '../db.js';

// Default values ถ้ายังไม่เคยตั้งค่า
const DEFAULTS: Record<string, string> = {
    exchange_rate_sync_hour: '18',
    exchange_rate_sync_enabled: 'true',
    exchange_rate_last_sync_at: '',
    exchange_rate_last_status: 'idle',
    exchange_rate_last_records: '0',
    exchange_rate_last_error: '',
};

/** อ่านค่า config 1 ค่า */
export async function getConfig(key: string): Promise<string> {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? '';
}

/** เขียน/อัปเดต config 1 ค่า */
export async function setConfig(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
}

/** อ่านหลายค่าพร้อมกัน */
export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
    const rows = await prisma.systemConfig.findMany({
        where: { key: { in: keys } },
    });

    const result: Record<string, string> = { ...Object.fromEntries(keys.map(k => [k, DEFAULTS[k] ?? ''])) };
    for (const row of rows) {
        result[row.key] = row.value;
    }
    return result;
}

/** อ่าน config ทั้งหมดสำหรับ exchange rate sync */
export async function getExchangeRateSyncConfig() {
    const cfg = await getConfigs([
        'exchange_rate_sync_hour',
        'exchange_rate_sync_enabled',
        'exchange_rate_last_sync_at',
        'exchange_rate_last_status',
        'exchange_rate_last_records',
        'exchange_rate_last_error',
    ]);

    return {
        syncHour: parseInt(cfg.exchange_rate_sync_hour ?? '18'),
        enabled: cfg.exchange_rate_sync_enabled !== 'false',
        lastSyncAt: cfg.exchange_rate_last_sync_at || null,
        lastStatus: cfg.exchange_rate_last_status as 'idle' | 'running' | 'success' | 'partial' | 'error',
        lastRecords: parseInt(cfg.exchange_rate_last_records ?? '0'),
        lastError: cfg.exchange_rate_last_error || null,
    };
}
