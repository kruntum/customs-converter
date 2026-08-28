import { create } from 'zustand';

export interface DashboardStats {
    thbByMonth: Record<string, number>;
    thbByCurrency: Record<string, number>;
    topCustomers: { name: string; gain: number }[];
    totalUnpaidCount: number;
    unpaidInvoices: {
        id: number;
        invoiceNumber: string;
        customerName: string;
        currencyCode: string;
        invoiceDate: string;
        agingDays: number;
        pendingFcy: number;
        estimatedThbValue: number;
    }[];
}

interface DashboardStore {
    stats: DashboardStats | null;
    loading: boolean;
    error: string | null;
    fetchStats: (companyId: number, year?: number, month?: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
    stats: null,
    loading: false,
    error: null,

    fetchStats: async (companyId: number, year?: number, month?: number) => {
        set({ loading: true, error: null });
        try {
            let url = `/api/dashboard/${companyId}/stats`;
            const params = new URLSearchParams();
            if (year) params.append('year', year.toString());
            if (month) params.append('month', month.toString());

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Failed to fetch stats (Status: ${res.status})`);
            }

            const data: DashboardStats = await res.json();
            set({ stats: data });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            set({ error: (error as Error).message });
        } finally {
            set({ loading: false });
        }
    }
}));
