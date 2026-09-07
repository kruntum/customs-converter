import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { AppEnv } from '../types.js';
import { requireCompanyRole } from '../middleware/companyAuth.js';

const excelTemplateRoutes = new Hono<AppEnv>();

const templateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    mapping: z.record(z.string(), z.string()),
    isDefault: z.boolean().optional().default(false),
});

// Require company authorization
excelTemplateRoutes.use('*', requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE', 'DATA_ENTRY']));

// GET /api/excel-templates - List templates for active company
excelTemplateRoutes.get('/', async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);

    if (!companyId) {
        return c.json({ error: 'Company ID required' }, 400);
    }

    const templates = await prisma.excelTemplate.findMany({
        where: { companyId },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return c.json({ data: templates });
});

// POST /api/excel-templates - Create template
excelTemplateRoutes.post('/', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const user = c.get('user');
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const body = await c.req.json();

    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { name, mapping, isDefault } = parsed.data;

    // If setting as default, unset others first
    if (isDefault) {
        await prisma.excelTemplate.updateMany({
            where: { companyId },
            data: { isDefault: false },
        });
    }

    const template = await prisma.excelTemplate.create({
        data: {
            companyId,
            name,
            mapping,
            isDefault: !!isDefault,
            createdBy: user.id,
        },
    });

    return c.json({ data: template }, 201);
});

// PUT /api/excel-templates/:id - Update template
excelTemplateRoutes.put('/:id', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();

    const existing = await prisma.excelTemplate.findUnique({
        where: { id },
    });

    if (!existing || existing.companyId !== companyId) {
        return c.json({ error: 'Template not found' }, 404);
    }

    const parsed = templateSchema.partial().safeParse(body);
    if (!parsed.success) {
        return c.json({ error: 'Validation failed', details: parsed.error.format() }, 400);
    }

    const { name, mapping, isDefault } = parsed.data;

    // If setting as default, unset others first
    if (isDefault) {
        await prisma.excelTemplate.updateMany({
            where: { companyId, id: { not: id } },
            data: { isDefault: false },
        });
    }

    const updated = await prisma.excelTemplate.update({
        where: { id },
        data: {
            ...(name ? { name } : {}),
            ...(mapping ? { mapping } : {}),
            ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
        },
    });

    return c.json({ data: updated });
});

// DELETE /api/excel-templates/:id - Delete template
excelTemplateRoutes.delete('/:id', requireCompanyRole(['OWNER', 'ADMIN', 'DATA_ENTRY']), async (c) => {
    const companyUser = c.get('companyUser');
    const companyId = companyUser?.companyId || parseInt((c.req.query('companyId') || c.req.header('x-company-id')) as string);
    const id = parseInt(c.req.param('id'));

    const existing = await prisma.excelTemplate.findUnique({
        where: { id },
    });

    if (!existing || existing.companyId !== companyId) {
        return c.json({ error: 'Template not found' }, 404);
    }

    await prisma.excelTemplate.delete({
        where: { id },
    });

    return c.json({ success: true });
});

export default excelTemplateRoutes;
