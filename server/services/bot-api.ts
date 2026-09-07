import { subDays, format } from 'date-fns';
import { prisma } from '../db.js';

interface BotApiResponse {
    result: {
        timestamp: string;
        api: string;
        data: {
            data_header: {
                report_name_eng: string;
                report_name_th: string;
                last_updated: string;
            };
            data_detail: Array<{
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

export interface ExchangeRateResult {
    currencyId: string;
    period: string;
    buyingTransfer: string;
    selling: string | null;
    source: string;
}

/**
 * Fetch exchange rate from Bank of Thailand API
 * Uses buying_transfer rate as requested
 */
export async function fetchBotExchangeRate(
    currency: string,
    date: string,
): Promise<ExchangeRateResult | null> {
    // 1. Check local database first
    try {
        const targetDate = new Date(date);
        if (!isNaN(targetDate.getTime())) {
            const localRate = await prisma.exchangeRate.findUnique({
                where: {
                    currencyCode_rateDate: {
                        currencyCode: currency,
                        rateDate: targetDate
                    }
                }
            });
            if (localRate) {
                return {
                    currencyId: localRate.currencyCode,
                    period: format(localRate.rateDate, 'yyyy-MM-dd'),
                    buyingTransfer: localRate.buyingTransfer.toString(),
                    selling: localRate.selling ? localRate.selling.toString() : null,
                    source: 'LOCAL_DB'
                };
            }
        }
    } catch (dbError) {
        console.error('Error fetching exchange rate from local DB:', dbError);
    }

    // 2. Fetch from BOT API
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.warn('BOT_API_KEY not configured, returning null');
        return null;
    }

    const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${date}&end_period=${date}&currency=${currency}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Authorization': apiKey,
            },
        });

        if (!response.ok) {
            console.error(`BOT API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data: BotApiResponse = await response.json();
        const detail = data.result?.data?.data_detail?.[0];

        if (!detail) {
            console.warn(`No exchange rate data for ${currency} on ${date}`);
            return null;
        }

        const rateResult = {
            currencyId: detail.currency_id,
            period: detail.period,
            buyingTransfer: detail.buying_transfer,
            selling: detail.selling || null,
            source: 'BOT',
        };

        // Cache it in the database
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
        } catch (cacheError) {
            console.error('Failed to cache exchange rate in database:', cacheError);
        }

        return rateResult;
    } catch (error) {
        console.error('BOT API fetch error:', error);
        return null;
    }
}

/**
 * Fetch exchange rate from Bank of Thailand API with lookback.
 * Queries a 15-day range in a single request and returns the most recent available rate.
 */
export async function fetchBotExchangeRateWithFallback(
    currency: string,
    submissionDateStr: string,
): Promise<ExchangeRateResult | null> {
    // Customs rate rule: Rate date MUST be T - 1 (the day before customs submission date),
    // or the most recent prior working day if T - 1 has no rate (e.g. weekend/holiday).
    let submissionDate = new Date(submissionDateStr);
    if (isNaN(submissionDate.getTime())) {
        submissionDate = new Date();
    }

    // T - 1 date (end of day to include any rates stored on that date)
    const targetRateDate = subDays(submissionDate, 1);
    targetRateDate.setUTCHours(23, 59, 59, 999);

    // 1. Check local database first for the most recent rate on or before targetRateDate (T - 1)
    try {
        const localRate = await prisma.exchangeRate.findFirst({
            where: {
                currencyCode: currency,
                rateDate: { lte: targetRateDate }
            },
            orderBy: {
                rateDate: 'desc'
            }
        });

        // Verify if it is within a 6-month window (180 days lookback for accounting historical entry)
        if (localRate) {
            const diffTime = Math.abs(targetRateDate.getTime() - localRate.rateDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 180) {
                return {
                    currencyId: localRate.currencyCode,
                    period: format(localRate.rateDate, 'yyyy-MM-dd'),
                    buyingTransfer: localRate.buyingTransfer.toString(),
                    selling: localRate.selling ? localRate.selling.toString() : null,
                    source: 'LOCAL_DB'
                };
            }
        }
    } catch (dbError) {
        console.error('Error fetching exchange rate from local database:', dbError);
    }

    // 2. Fetch from BOT API (query window from targetRateDate down to 180 days prior)
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.warn('BOT_API_KEY not configured, returning null');
        return null;
    }

    try {
        const endDate = targetRateDate;
        const startDate = subDays(targetRateDate, 180);

        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        const url = `https://gateway.api.bot.or.th/Stat-ExchangeRate/v2/DAILY_AVG_EXG_RATE/?start_period=${startDateStr}&end_period=${endDateStr}&currency=${currency}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Authorization': apiKey,
            },
        });

        if (!response.ok) {
            console.error(`BOT API error in range fetch: ${response.status} ${response.statusText}`);
            return null;
        }

        const data: BotApiResponse = await response.json();
        const details = data.result?.data?.data_detail;

        if (!details || details.length === 0) {
            console.warn(`No exchange rate range data for ${currency} between ${startDateStr} and ${endDateStr}`);
            return null;
        }

        // Sort details by period descending (most recent date first)
        const validRates = details
            .filter(item => item.period && item.buying_transfer)
            .sort((a, b) => b.period.localeCompare(a.period));

        if (validRates.length === 0) {
            return null;
        }

        const mostRecent = validRates[0];
        const rateResult = {
            currencyId: mostRecent.currency_id,
            period: mostRecent.period,
            buyingTransfer: mostRecent.buying_transfer,
            selling: mostRecent.selling || null,
            source: 'BOT',
        };

        // Cache all retrieved daily rates in the local database so future imports for this period hit LOCAL_DB
        try {
            for (const item of validRates) {
                const itemDate = new Date(item.period);
                if (!isNaN(itemDate.getTime()) && item.buying_transfer) {
                    await prisma.exchangeRate.upsert({
                        where: {
                            currencyCode_rateDate: {
                                currencyCode: currency,
                                rateDate: itemDate
                            }
                        },
                        update: {
                            buyingTransfer: item.buying_transfer,
                            selling: item.selling || null,
                        },
                        create: {
                            currencyCode: currency,
                            rateDate: itemDate,
                            buyingTransfer: item.buying_transfer,
                            selling: item.selling || null,
                        }
                    });
                }
            }
        } catch (cacheError) {
            console.error('Failed to cache exchange rates in database:', cacheError);
        }

        return rateResult;
    } catch (error) {
        console.error('Error in fetchBotExchangeRateWithFallback:', error);
        return null;
    }
}

