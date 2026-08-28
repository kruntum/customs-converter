import { Hono } from 'hono';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';
import { differenceInDays, format } from 'date-fns';

const dashboardRoutes = new Hono<AppEnv>();

// GET /api/dashboard/:companyId/stats
dashboardRoutes.get('/:companyId/stats', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    if (isNaN(companyId)) {
        return c.json({ error: 'Invalid company ID' }, 400);
    }

    const yearQuery = c.req.query('year');
    const monthQuery = c.req.query('month');

    const targetYear = yearQuery ? parseInt(yearQuery) : new Date().getFullYear();
    const targetMonth = monthQuery ? parseInt(monthQuery) : null;

    let startDate: Date;
    let endDate: Date;

    if (targetMonth !== null && !isNaN(targetMonth)) {
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    } else {
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    }

    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                companyId,
                invoiceDate: { gte: startDate, lte: endDate }
            },
            select: {
                id: true,
                invoiceDate: true,
                currencyCode: true,
                thbAmount: true,
                foreignAmount: true,
                exchangeRate: true,
                invoiceNumber: true,
                customer: { select: { id: true, name: true } }
            }
        });

        const pendingTransactions = await prisma.transaction.findMany({
            where: { companyId },
            include: { customer: { select: { name: true } } },
            orderBy: { invoiceDate: 'asc' },
            take: 5
        });

        const totalUnpaidCount = await prisma.transaction.count({ where: { companyId } });

        const thbByMonth: Record<string, number> = {};
        const thbByCurrency: Record<string, number> = {};
        const customerTotals: Record<number, { name: string; total: number }> = {};

        transactions.forEach(t => {
            const thb = Number(t.thbAmount);
            const monthKey = format(new Date(t.invoiceDate), 'yyyy-MM');
            thbByMonth[monthKey] = (thbByMonth[monthKey] || 0) + thb;
            thbByCurrency[t.currencyCode] = (thbByCurrency[t.currencyCode] || 0) + thb;

            if (t.customer) {
                const cId = t.customer.id;
                if (!customerTotals[cId]) customerTotals[cId] = { name: t.customer.name, total: 0 };
                customerTotals[cId].total += thb;
            }
        });

        const topCustomers = Object.values(customerTotals)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(c => ({ name: c.name, gain: c.total }));

        const now = new Date();
        const unpaidInvoices = pendingTransactions.map(t => {
            const pendingFcy = Number(t.foreignAmount);
            const thbValue = pendingFcy * Number(t.exchangeRate);
            const agingDays = differenceInDays(now, new Date(t.invoiceDate));
            return {
                id: t.id,
                invoiceNumber: t.invoiceNumber,
                customerName: t.customer?.name || 'Unknown',
                currencyCode: t.currencyCode,
                invoiceDate: t.invoiceDate,
                agingDays,
                pendingFcy,
                estimatedThbValue: thbValue
            };
        });

        return c.json({
            thbByMonth,
            thbByCurrency,
            topCustomers,
            unpaidInvoices,
            totalUnpaidCount
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
    }
});

export default dashboardRoutes;
