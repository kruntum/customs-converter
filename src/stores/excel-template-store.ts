import { create } from 'zustand';

export interface ExcelTemplate {
    id: number;
    companyId: number;
    name: string;
    mapping: Record<string, string>;
    isDefault: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string; email: string };
}

interface ExcelTemplateState {
    templates: Record<number, ExcelTemplate[]>; // Grouped by companyId
    loading: boolean;
    error: string | null;

    fetchTemplates: (companyId: number) => Promise<ExcelTemplate[]>;
    createTemplate: (companyId: number, data: { name: string; mapping: Record<string, string>; isDefault?: boolean }) => Promise<ExcelTemplate>;
    updateTemplate: (companyId: number, id: number, data: { name?: string; mapping?: Record<string, string>; isDefault?: boolean }) => Promise<ExcelTemplate>;
    deleteTemplate: (companyId: number, id: number) => Promise<void>;
}

export const useExcelTemplateStore = create<ExcelTemplateState>((set, get) => ({
    templates: {},
    loading: false,
    error: null,

    fetchTemplates: async (companyId: number) => {
        set({ loading: true, error: null });
        try {
            const res = await fetch(`/api/excel-templates?companyId=${companyId}`, {
                headers: { 'x-company-id': String(companyId) },
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to fetch templates');
            const json = await res.json();
            const data = json.data || [];
            set(state => ({
                templates: { ...state.templates, [companyId]: data }
            }));
            return data;
        } catch (err) {
            set({ error: (err as Error).message });
            return [];
        } finally {
            set({ loading: false });
        }
    },

    createTemplate: async (companyId: number, data) => {
        const res = await fetch(`/api/excel-templates?companyId=${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-company-id': String(companyId),
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            let errorMsg = 'Failed to create template';
            try {
                const err = await res.json();
                errorMsg = err.error || errorMsg;
            } catch {
                const txt = await res.text().catch(() => '');
                errorMsg = txt || errorMsg;
            }
            throw new Error(errorMsg);
        }
        const json = await res.json();
        const created: ExcelTemplate = json.data;

        await get().fetchTemplates(companyId);
        return created;
    },

    updateTemplate: async (companyId: number, id: number, data) => {
        const res = await fetch(`/api/excel-templates/${id}?companyId=${companyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-company-id': String(companyId),
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            let errorMsg = 'Failed to update template';
            try {
                const err = await res.json();
                errorMsg = err.error || errorMsg;
            } catch {
                const txt = await res.text().catch(() => '');
                errorMsg = txt || errorMsg;
            }
            throw new Error(errorMsg);
        }
        const json = await res.json();
        const updated: ExcelTemplate = json.data;

        await get().fetchTemplates(companyId);
        return updated;
    },

    deleteTemplate: async (companyId: number, id: number) => {
        const res = await fetch(`/api/excel-templates/${id}?companyId=${companyId}`, {
            method: 'DELETE',
            headers: {
                'x-company-id': String(companyId),
            },
            credentials: 'include',
        });
        if (!res.ok) {
            let errorMsg = 'Failed to delete template';
            try {
                const err = await res.json();
                errorMsg = err.error || errorMsg;
            } catch {
                const txt = await res.text().catch(() => '');
                errorMsg = txt || errorMsg;
            }
            throw new Error(errorMsg);
        }
        await get().fetchTemplates(companyId);
    },
}));
