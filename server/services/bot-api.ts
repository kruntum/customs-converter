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
    // 1. Check local database first
    try {
        let targetDate = new Date(submissionDateStr);
        if (isNaN(targetDate.getTime())) {
            targetDate = new Date();
        }

        // Find the most recent rate on or before the targetDate
        const localRate = await prisma.exchangeRate.findFirst({
            where: {
                currencyCode: currency,
                rateDate: { lte: targetDate }
            },
            orderBy: {
                rateDate: 'desc'
            }
        });

        // Verify if it is within a reasonable window (15 days lookback)
        if (localRate) {
            const diffTime = Math.abs(targetDate.getTime() - localRate.rateDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 15) {
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

    // 2. Fetch from BOT API
    const apiKey = process.env.BOT_API_KEY;

    if (!apiKey || apiKey === 'your_bot_api_key_here') {
        console.warn('BOT_API_KEY not configured, returning null');
        return null;
    }

    try {
        let currentDate = new Date(submissionDateStr);
        if (isNaN(currentDate.getTime())) {
            currentDate = new Date();
        }

        // We want to check from (currentDate - 1 day) back to (currentDate - 15 days)
        const endDate = subDays(currentDate, 1);
        const startDate = subDays(currentDate, 15);

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

        // Cache the retrieved rate in the local database
        try {
            await prisma.exchangeRate.upsert({
                where: {
                    currencyCode_rateDate: {
                        currencyCode: currency,
                        rateDate: new Date(mostRecent.period)
                    }
                },
                update: {
                    buyingTransfer: mostRecent.buying_transfer,
                    selling: mostRecent.selling || null,
                },
                create: {
                    currencyCode: currency,
                    rateDate: new Date(mostRecent.period),
                    buyingTransfer: mostRecent.buying_transfer,
                    selling: mostRecent.selling || null,
                }
            });

            // Also write cache entry for the *requested* date if different (e.g. weekend falling back to Friday)
            const requestedDateOnlyStr = submissionDateStr.split('T')[0];
            if (requestedDateOnlyStr !== mostRecent.period) {
                await prisma.exchangeRate.upsert({
                    where: {
                        currencyCode_rateDate: {
                            currencyCode: currency,
                            rateDate: new Date(requestedDateOnlyStr)
                        }
                    },
                    update: {
                        buyingTransfer: mostRecent.buying_transfer,
                        selling: mostRecent.selling || null,
                    },
                    create: {
                        currencyCode: currency,
                        rateDate: new Date(requestedDateOnlyStr),
                        buyingTransfer: mostRecent.buying_transfer,
                        selling: mostRecent.selling || null,
                    }
                });
            }
        } catch (cacheError) {
            console.error('Failed to cache exchange rate in database:', cacheError);
        }

        return rateResult;
    } catch (error) {
        console.error('Error in fetchBotExchangeRateWithFallback:', error);
        return null;
    }
}

