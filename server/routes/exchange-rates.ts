import { Hono } from 'hono';
import { fetchBotExchangeRate, fetchBotExchangeRateWithFallback } from '../services/bot-api.js';
import { prisma } from '../db.js';

const exchangeRateRoutes = new Hono();

// GET /api/rates/bot-fallback/:currency/:date
exchangeRateRoutes.get('/bot-fallback/:currency/:date', async (c) => {
    const currency = c.req.param('currency').toUpperCase();
    const date = c.req.param('date');

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    // THB to THB is always 1
    if (currency === 'THB') {
        return c.json({
            data: {
                currencyId: 'THB',
                period: date,
                buyingTransfer: '1.0000000',
                source: 'SYSTEM',
            },
        });
    }

    const rate = await fetchBotExchangeRateWithFallback(currency, date);

    if (!rate) {
        return c.json({
            error: 'Exchange rate not available. You can enter the rate manually.',
            data: null,
        }, 404);
    }

    return c.json({ data: rate });
});

// GET /api/rates/:currency/:date
exchangeRateRoutes.get('/:currency/:date', async (c) => {
    const currency = c.req.param('currency').toUpperCase();
    const date = c.req.param('date');

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    // Validate currency
    const validCurrencies = ['CNY', 'USD', 'EUR', 'JPY', 'GBP'];
    if (!validCurrencies.includes(currency)) {
        return c.json({ error: `Invalid currency. Supported: ${validCurrencies.join(', ')}` }, 400);
    }

    // THB to THB is always 1
    if (currency === 'THB') {
        return c.json({
            data: {
                currencyId: 'THB',
                period: date,
                buyingTransfer: '1.0000000',
                source: 'SYSTEM',
            },
        });
    }

    const rate = await fetchBotExchangeRate(currency, date);

    if (!rate) {
        return c.json({
            error: 'Exchange rate not available. You can enter the rate manually.',
            data: null,
        }, 404);
    }

    return c.json({ data: rate });
});

// GET /api/rates/calendar?currency=USD&start=2025-01-01&end=2025-12-31&page=1&limit=50
exchangeRateRoutes.get('/calendar', async (c) => {
    const currency = c.req.query('currency')?.toUpperCase();
    const start = c.req.query('start');
    const end = c.req.query('end');
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (currency && currency !== 'ALL') {
        where.currencyCode = currency;
    }
    if (start || end) {
        where.rateDate = {};
        if (start) (where.rateDate as Record<string, Date>).gte = new Date(start);
        if (end) {
            const endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);
            (where.rateDate as Record<string, Date>).lte = endDate;
        }
    }

    const [total, rates] = await Promise.all([
        prisma.exchangeRate.count({ where }),
        prisma.exchangeRate.findMany({
            where,
            orderBy: [{ rateDate: 'desc' }, { currencyCode: 'asc' }],
            skip,
            take: limit,
            select: {
                id: true,
                currencyCode: true,
                rateDate: true,
                buyingTransfer: true,
                selling: true,
                createdAt: true,
            },
        }),
    ]);

    return c.json({
        data: rates.map(r => ({
            id: r.id,
            currencyCode: r.currencyCode,
            rateDate: r.rateDate.toISOString().split('T')[0],
            buyingTransfer: r.buyingTransfer.toString(),
            selling: r.selling ? r.selling.toString() : null,
            createdAt: r.createdAt,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
});

export default exchangeRateRoutes;
