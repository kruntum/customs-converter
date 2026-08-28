import 'dotenv/config';
import { prisma } from '../server/db.ts';
import { subDays, format } from 'date-fns';

const currencies = ['CNY', 'USD', 'EUR', 'JPY', 'GBP']; // KRW: ไม่มีข้อมูลใน BOT API

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BotApiResponse {
    result: {
        timestamp?: string;
        api?: string;
        data?: {
            data_header?: {
                report_name_eng: string;
                report_name_th: string;
                last_updated: string;
            };
            data_detail?: Array<{
                period: string;
                currency_id: string;
                currency_name_th: string;
                currency_name_eng: string;
                buying_sight: string;
                buying_transfer: string;
                selling: string;
                mid_rate: string;
            }>;
        };
    };
}

async function main() {
    const apiKey = process.env.BOT_API_KEY;
    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.error('❌ BOT_API_KEY not configured in .env file!');
        process.exit(1);
    }

    console.log(`Starting exchange rate seeding for last 1 year for currencies: ${currencies.join(', ')}...`);

    // 1 year is approx 365 days
    const totalDays = 365;
    const chunkSize = 30; // BOT allows max 31 days per request
    const today = new Date();

    for (const currency of currencies) {
        console.log(`\nFetching ${currency} exchange rates...`);
        let fetchedCount = 0;
        let insertedCount = 0;

        // Fetch day range chunk by chunk, from 365 days ago until today
        for (let daysAgo = totalDays; daysAgo >= 0; daysAgo -= chunkSize) {
            const startOffset = daysAgo;
            const endOffset = Math.max(0, daysAgo - chunkSize + 1);

            const startDate = subDays(today, startOffset);
            const endDate = subDays(today, endOffset);

            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            console.log(`  -> Querying range: ${startDateStr} to ${endDateStr}...`);

            const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDateStr}&end_period=${endDateStr}&currency=${currency}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': '*/*',
                        'Authorization': apiKey,
                    },
                });

                if (!response.ok) {
                    console.error(`  ❌ BOT API error for ${currency} [${startDateStr} to ${endDateStr}]: ${response.status} ${response.statusText}`);
                    await wait(2000); // Wait longer on error
                    continue;
                }

                const data: BotApiResponse = await response.json();
                const details = data.result?.data?.data_detail || [];
                fetchedCount += details.length;

                // Bulk upsert the fetched rates
                for (const detail of details) {
                    if (detail.period && detail.buying_transfer) {
                        try {
                            await prisma.exchangeRate.upsert({
                                where: {
                                    currencyCode_rateDate: {
                                        currencyCode: currency,
                                        rateDate: new Date(detail.period)
                                    }
                                },
                                update: {
                                    buyingTransfer: detail.buying_transfer,
                                    selling: detail.selling || null,
                                },
                                create: {
                                    currencyCode: currency,
                                    rateDate: new Date(detail.period),
                                    buyingTransfer: detail.buying_transfer,
                                    selling: detail.selling || null,
                                }
                            });
                            insertedCount++;
                        } catch (dbErr) {
                            // Ignore duplicate errors
                        }
                    }
                }

                console.log(`  ✅ Received ${details.length} records, processed successfully.`);

            } catch (err) {
                console.error(`  ❌ Network/Parser error for ${currency}:`, err);
            }

            // Respect rate limits: wait 1 second between API calls
            await wait(1000);
        }

        console.log(`🎉 Finished ${currency}: fetched ${fetchedCount} items, inserted/updated ${insertedCount} records in local DB.`);
    }

    console.log('\n✅ Exchange rate seeding complete!');
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
});
