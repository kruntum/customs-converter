/**
 * Exchange Rate Daily Sync Service
 * ==================================
 * บริการซิงค์อัตราแลกเปลี่ยนอัตโนมัติจาก BOT API
 *
 * หลักการทำงาน:
 * - รัน cron job ทุกวันตามเวลาที่ตั้งใน DB (default 18:00 น.)
 * - Fetch ข้อมูล 7 วันล่าสุดสำหรับทุกสกุลเงิน (5 API calls เท่านั้น)
 * - Upsert เข้า DB — ถ้าวันนั้นมีอยู่แล้วก็อัปเดตค่าใหม่ ไม่ error
 * - บันทึกผลลัพธ์กลับเข้า SystemConfig เพื่อ Admin ดูได้
 * - อ่านเวลา sync จาก DB ทุกรอบ → เปลี่ยนได้ผ่าน UI ไม่ต้อง restart server
 */

import { subDays, format } from 'date-fns';
import { prisma } from '../db.js';
import { getConfig, setConfig, getExchangeRateSyncConfig } from './system-config.js';

// สกุลเงินที่ BOT API รองรับ (KRW ไม่มีข้อมูลใน BOT)
const SUPPORTED_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];

// จำนวนวันย้อนหลังที่ fetch ในแต่ละรอบ
// เหตุผลที่ใช้ 7 วัน ไม่ใช่แค่ 1 วัน:
//   - เสาร์/อาทิตย์ BOT ไม่ออกเรท → fetch วันเดียวได้ 0 records
//   - ถ้า server down ไป 2-3 วัน → 7 วัน ยังครอบคลุม gap ได้
//   - Upsert ทำให้ข้อมูลซ้ำไม่มีผลเสียใดๆ
const LOOKBACK_DAYS = 7;

interface BotRateRecord {
    period: string;
    buying_transfer: string;
    selling: string;
}

interface BotApiResponse {
    result?: {
        data?: {
            data_detail?: BotRateRecord[];
        };
    };
}

/**
 * Fetch อัตราแลกเปลี่ยนสำหรับ 1 สกุลเงิน ย้อนหลัง N วัน
 * แล้ว upsert เข้า DB ทั้งหมด
 */
async function syncCurrencyRates(currency: string, apiKey: string): Promise<number> {
    const today = new Date();
    const startDate = subDays(today, LOOKBACK_DAYS);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(today, 'yyyy-MM-dd');

    const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDateStr}&end_period=${endDateStr}&currency=${currency}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': '*/*', 'Authorization': apiKey },
    });

    if (!response.ok) {
        throw new Error(`BOT API error ${response.status}: ${response.statusText}`);
    }

    const data: BotApiResponse = await response.json();
    const details = data.result?.data?.data_detail ?? [];

    if (details.length === 0) return 0;

    const results = await Promise.allSettled(
        details
            .filter(d => d.period && d.buying_transfer)
            .map(d =>
                prisma.exchangeRate.upsert({
                    where: {
                        currencyCode_rateDate: {
                            currencyCode: currency,
                            rateDate: new Date(d.period),
                        },
                    },
                    update: {
                        buyingTransfer: d.buying_transfer,
                        selling: d.selling || null,
                    },
                    create: {
                        currencyCode: currency,
                        rateDate: new Date(d.period),
                        buyingTransfer: d.buying_transfer,
                        selling: d.selling || null,
                    },
                })
            )
    );

    return results.filter(r => r.status === 'fulfilled').length;
}

/**
 * Main sync function — รันทุกสกุลเงินต่อกัน (sequential)
 * บันทึกผลลัพธ์กลับเข้า SystemConfig ด้วย
 */
export async function runDailyExchangeRateSync(): Promise<void> {
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.warn('[ExchangeRateSync] ⚠️  BOT_API_KEY ไม่ได้ตั้งค่า — ข้ามการ sync');
        return;
    }

    // ตรวจสอบว่า enabled อยู่ไหม
    const enabledStr = await getConfig('exchange_rate_sync_enabled');
    if (enabledStr === 'false') {
        console.log('[ExchangeRateSync] ⏸️  Auto sync ถูกปิดใช้งาน — ข้ามการ sync');
        return;
    }

    // บันทึกสถานะว่ากำลัง running
    await setConfig('exchange_rate_last_status', 'running');

    const startTime = Date.now();
    console.log(`[ExchangeRateSync] 🔄 เริ่ม sync — ${new Date().toLocaleString('th-TH')}`);

    let totalSynced = 0;
    const errors: string[] = [];

    for (const currency of SUPPORTED_CURRENCIES) {
        try {
            const count = await syncCurrencyRates(currency, apiKey);
            totalSynced += count;
            console.log(`[ExchangeRateSync]   ✅ ${currency}: ${count} records`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${currency}: ${msg}`);
            console.error(`[ExchangeRateSync]   ❌ ${currency}: ${msg}`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const status = errors.length === 0 ? 'success' : (totalSynced > 0 ? 'partial' : 'error');

    // บันทึกผลลัพธ์ลง DB เพื่อให้ Admin ดูได้
    await Promise.all([
        setConfig('exchange_rate_last_sync_at', new Date().toISOString()),
        setConfig('exchange_rate_last_status', status),
        setConfig('exchange_rate_last_records', String(totalSynced)),
    ]);

    if (status === 'success') {
        console.log(`[ExchangeRateSync] ✅ Sync เสร็จ — ${totalSynced} records ใน ${elapsed}s`);
    } else {
        console.warn(`[ExchangeRateSync] ⚠️  Sync เสร็จบางส่วน — ${totalSynced} records, ${errors.length} errors ใน ${elapsed}s`);
    }
}

/**
 * คำนวณ milliseconds จากตอนนี้ถึง HH:00 น. ของวันนี้หรือพรุ่งนี้
 */
function msUntilHour(hour: number): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
}

/**
 * เริ่มต้น Cron Job แบบ Dynamic
 *
 * อ่านเวลา sync จาก DB ทุกรอบ → เปลี่ยนได้ผ่าน Admin UI
 * โดยไม่ต้อง restart server
 *
 * Flow:
 *   รอจนถึง syncHour:00 น. (อ่านจาก DB ตอนนี้)
 *   → รัน sync
 *   → รอ 24 ชั่วโมง
 *   → อ่าน syncHour ใหม่จาก DB (อาจเปลี่ยนไปแล้ว)
 *   → รอจนถึงเวลาใหม่
 *   → วนซ้ำ
 */
export function startExchangeRateCronJob(): void {
    const runAndScheduleNext = async () => {
        // รัน sync
        await runDailyExchangeRateSync();

        // อ่านเวลา sync ล่าสุดจาก DB (admin อาจเปลี่ยนค่าแล้ว)
        const syncHour = parseInt(await getConfig('exchange_rate_sync_hour') ?? '18');
        const delay = msUntilHour(syncHour);
        const nextRun = new Date(Date.now() + delay);

        console.log(
            `[ExchangeRateSync] 📅 Cron ถัดไป: ${nextRun.toLocaleString('th-TH')} ` +
            `(${syncHour}:00 น., อีก ${(delay / 1000 / 60 / 60).toFixed(1)} ชั่วโมง)`
        );

        setTimeout(runAndScheduleNext, delay);
    };

    // Kickoff: อ่านค่าจาก DB แล้วรอจนถึงเวลาแรก
    getConfig('exchange_rate_sync_hour').then(hourStr => {
        const syncHour = parseInt(hourStr ?? '18');
        const delay = msUntilHour(syncHour);
        const nextRun = new Date(Date.now() + delay);

        console.log(
            `[ExchangeRateSync] 📅 Cron จะรันครั้งแรกที่: ${nextRun.toLocaleString('th-TH')} ` +
            `(${syncHour}:00 น., อีก ${(delay / 1000 / 60 / 60).toFixed(1)} ชั่วโมง)`
        );

        setTimeout(runAndScheduleNext, delay);
    });
}
