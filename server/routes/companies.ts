import { Hono } from 'hono';
import { prisma } from '../db';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { requireCompanyRole } from '../middleware/companyAuth';

const companyRoutes = new Hono<AppEnv>();

const companySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    taxId: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    roundingMethod: z.enum(['ITEM_ROUNDING', 'TOTAL_ROUNDING']).optional(),
});

// GET /api/companies — List active companies for current user
companyRoutes.get('/', async (c) => {
    const user = c.get('user');
    const showCancelled = c.req.query('showCancelled') === 'true';

    const where: Record<string, unknown> = {};

    // Role-based access: user sees only own or where they are a member, admin sees all
    if (user.role !== 'admin') {
        where.OR = [
            { createdBy: user.id },
            { companyUsers: { some: { userId: user.id } } }
        ];
    }

    // By default, only show active companies
    if (!showCancelled) {
        where.status = 'active';
    }

    const companies = await prisma.company.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, name: true, email: true } },
            companyUsers: true,
        },
    });

    return c.json({ data: companies });
});

// GET /api/companies/:id
companyRoutes.get('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));

    const company = await prisma.company.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    if (!company) {
        return c.json({ error: 'Company not found' }, 404);
    }

    const companyUser = await prisma.companyUser.findUnique({
        where: { userId_companyId: { userId: user.id, companyId: id } }
    });

    if (user.role !== 'admin' && company.createdBy !== user.id && !companyUser) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    return c.json({ data: company });
});

// POST /api/companies
companyRoutes.post('/', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();

    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;

    const company = await prisma.company.create({
        data: {
            name: data.name,
            taxId: data.taxId || null,
            address: data.address || null,
            phone: data.phone || null,
            roundingMethod: data.roundingMethod || 'ITEM_ROUNDING',
            createdBy: user.id,
            companyUsers: {
                create: {
                    userId: user.id,
                    role: 'OWNER'
                }
            },
            customers: {
                create: {
                    name: 'ลูกค้าทั่วไป',
                    createdBy: user.id
                }
            }
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return c.json({ data: company }, 201);
});

// PUT /api/companies/:id
companyRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const existing = await prisma.company.findUnique({ where: { id } });

    if (!existing) {
        return c.json({ error: 'Company not found' }, 404);
    }

    // Check RBAC: must be OWNER, ADMIN, or global admin
    if (user.role !== 'admin') {
        const companyUser = await prisma.companyUser.findUnique({
            where: { userId_companyId: { userId: user.id, companyId: id } }
        });
        if (!companyUser || !['OWNER', 'ADMIN'].includes(companyUser.role)) {
            return c.json({ error: 'Forbidden: Only OWNER or ADMIN can edit company details' }, 403);
        }
    }

    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const data = parsed.data;

    const company = await prisma.company.update({
        where: { id },
        data: {
            name: data.name,
            taxId: data.taxId || null,
            address: data.address || null,
            phone: data.phone || null,
            roundingMethod: data.roundingMethod,
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return c.json({ data: company });
});

// DELETE /api/companies/:id — Soft delete (set status to "cancelled")
companyRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const id = parseInt(c.req.param('id'));

    const existing = await prisma.company.findUnique({ where: { id } });

    if (!existing) {
        return c.json({ error: 'Company not found' }, 404);
    }

    // Only global admin or company OWNER can delete
    if (user.role !== 'admin') {
        const companyUser = await prisma.companyUser.findUnique({
            where: { userId_companyId: { userId: user.id, companyId: id } }
        });
        if (!companyUser || companyUser.role !== 'OWNER') {
            return c.json({ error: 'Forbidden: Only OWNER can cancel a company' }, 403);
        }
    }

    if (existing.status === 'cancelled') {
        return c.json({ error: 'Company is already cancelled' }, 400);
    }

    await prisma.company.update({
        where: { id },
        data: { status: 'cancelled' },
    });

    return c.json({ message: 'Company cancelled successfully' });
});

export default companyRoutes;

// --- Company Users Management Routes ---

const companyUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']),
});

// GET /api/companies/:companyId/users - List all members in a company
companyRoutes.get('/:companyId/users', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    const members = await prisma.companyUser.findMany({
        where: { companyId },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } }
        },
        orderBy: { createdAt: 'asc' }
    });
    return c.json({ data: members });
});

// POST /api/companies/:companyId/users - Add a member to a company
companyRoutes.post('/:companyId/users', requireCompanyRole(['OWNER', 'ADMIN']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    const body = await c.req.json();

    const parsed = companyUserSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { email, role } = parsed.data;

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
        return c.json({ error: 'User with this email not found' }, 404);
    }

    const existingMember = await prisma.companyUser.findUnique({
        where: { userId_companyId: { userId: targetUser.id, companyId } }
    });

    if (existingMember) {
        return c.json({ error: 'User is already a member of this company' }, 400);
    }

    const newMember = await prisma.companyUser.create({
        data: {
            userId: targetUser.id,
            companyId,
            role
        },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } }
        }
    });

    return c.json({ data: newMember }, 201);
});

// PUT /api/companies/:companyId/users/:userId - Update member role
companyRoutes.put('/:companyId/users/:userId', requireCompanyRole(['OWNER', 'ADMIN']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    const userId = c.req.param('userId');
    const currentUser = c.get('user');
    const currentCompanyUser = c.get('companyUser');
    const { role } = await c.req.json();

    if (!['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400);
    }

    // Find target member
    const targetMember = await prisma.companyUser.findUnique({
        where: { userId_companyId: { userId, companyId } }
    });
    if (!targetMember) {
        return c.json({ error: 'Member not found' }, 404);
    }

    // Only OWNER (or global admin) can change another OWNER's role
    if (targetMember.role === 'OWNER' && currentCompanyUser?.role !== 'OWNER' && currentUser.role !== 'admin') {
        return c.json({ error: 'Forbidden: Only an OWNER can change another OWNER\'s role' }, 403);
    }

    // Attempt to update
    try {
        const updatedMember = await prisma.companyUser.update({
            where: { userId_companyId: { userId, companyId } },
            data: { role },
            include: { user: { select: { id: true, name: true, email: true, image: true } } }
        });
        return c.json({ data: updatedMember });
    } catch (e) {
        return c.json({ error: 'Member not found or could not be updated' }, 404);
    }
});

// DELETE /api/companies/:companyId/users/:userId - Remove member
companyRoutes.delete('/:companyId/users/:userId', requireCompanyRole(['OWNER', 'ADMIN']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    const userId = c.req.param('userId');
    const currentUser = c.get('user');

    if (userId === currentUser.id) {
        return c.json({ error: 'Cannot remove yourself' }, 400);
    }

    try {
        await prisma.companyUser.delete({
            where: { userId_companyId: { userId, companyId } },
        });
        return c.json({ message: 'Member removed successfully' });
    } catch (e) {
        return c.json({ error: 'Member not found' }, 404);
    }
});

// PUT /api/companies/:companyId/excel-mapping
companyRoutes.put('/:companyId/excel-mapping', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']), async (c) => {
    const companyId = parseInt(c.req.param('companyId'));
    const body = await c.req.json();
    const { mapping } = body as { mapping: any };

    if (!mapping || typeof mapping !== 'object') {
        return c.json({ error: 'Invalid mapping object' }, 400);
    }

    const company = await prisma.company.update({
        where: { id: companyId },
        data: {
            excelMapping: mapping
        }
    });

    return c.json({ data: company });
});
