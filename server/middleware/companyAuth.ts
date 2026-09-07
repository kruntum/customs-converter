import type { Context, Next } from 'hono';
import type { AppEnv } from '../types.js';
import { prisma } from '../db.js';

/**
 * Middleware to check if the user has a specific role in a company.
 * Assumes authMiddleware has already run and `c.get('user')` is available.
 * Resolves companyId from: route param → query param → x-company-id header.
 */
export function requireCompanyRole(allowedRoles: string[]) {
    return async (c: Context<AppEnv>, next: Next) => {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized: Authentication required' }, 401);
        }

        const companyIdParam =
            c.req.param('companyId') ||
            c.req.query('companyId') ||
            c.req.header('x-company-id');

        if (!companyIdParam) {
            return c.json({ error: 'Company ID is required' }, 400);
        }

        const companyId = parseInt(companyIdParam);
        if (isNaN(companyId)) {
            return c.json({ error: 'Invalid Company ID' }, 400);
        }

        // Global admin: verify company exists, then grant access
        if (user.role === 'admin') {
            const company = await prisma.company.findUnique({ where: { id: companyId } });
            if (!company) {
                return c.json({ error: 'Company not found' }, 404);
            }
            // Look up companyUser for admin (may or may not be a member)
            const companyUser = await prisma.companyUser.findUnique({
                where: { userId_companyId: { userId: user.id, companyId } },
            });
            // Set companyUser if member, else set a synthetic OWNER-level context
            c.set('companyUser', companyUser ?? {
                id: 0,
                userId: user.id,
                companyId,
                role: 'OWNER',
                createdAt: new Date(),
            } as any);
            return await next();
        }

        // Regular user: must be a member of the company
        const companyUser = await prisma.companyUser.findUnique({
            where: {
                userId_companyId: { userId: user.id, companyId },
            },
        });

        if (!companyUser) {
            return c.json({ error: 'Forbidden: You do not have access to this company' }, 403);
        }

        if (!allowedRoles.includes(companyUser.role)) {
            return c.json({ error: 'Forbidden: You do not have the required role for this company' }, 403);
        }

        c.set('companyUser', companyUser);
        await next();
    };
}
