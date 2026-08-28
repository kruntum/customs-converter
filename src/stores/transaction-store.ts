import { create } from 'zustand';

export interface InvoiceItem {
    id?: number;
    itemNo: number;
    goodsName: string;
    netWeight: string;
    price: string;
    priceTHB: string;
    totalPrice: string;
    totalPriceTHB: string;
}

export interface Invoice {
    id?: number;
    invoiceNumber: string;
    invoiceDate: string;
    totalForeign: string;
    totalThb: string;
    items: InvoiceItem[];
}

export interface Transaction {
    id: number;
    declarationNumber: string;
    declarationDate: string;
    invoiceNumber: string;
    invoiceDate: string;
    currencyCode: string;
    foreignAmount: string;
    exchangeRate: string;
    thbAmount: string;
    rateDate: string;
    rateSource: string;
    createdBy: string;
    companyId: number | null;
    customerId: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    user?: { id: string; name: string; email: string };
    currency?: { code: string; nameTh: string; nameEn: string; symbol: string };
    invoices?: Invoice[];
    _count?: { invoices: number };
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface TransactionState {
    transactions: Transaction[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    searchQuery: string;
    companyId: number | null;
    filterCurrency: string;
    filterCustomerId: string;
    filterYear: string;
    filterMonth: string;

    setSearchQuery: (query: string) => void;
    setLimit: (limit: number) => void;
    setCompanyId: (companyId: number | null) => void;
    setFilterCurrency: (currency: string) => void;
    setFilterCustomerId: (customerId: string) => void;
    setFilterYear: (year: string) => void;
    setFilterMonth: (month: string) => void;
    fetchTransactions: (page?: number) => Promise<void>;
    fetchTransaction: (id: number) => Promise<Transaction>;
    createTransaction: (data: Record<string, unknown>) => Promise<Transaction>;
    updateTransaction: (id: number, data: Record<string, unknown>) => Promise<Transaction>;
    deleteTransaction: (id: number) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
    loading: false,
    error: null,
    searchQuery: '',
    companyId: null,
    filterCurrency: '',
    filterCustomerId: '',
    filterYear: '',
    filterMonth: '',

    setSearchQuery: (query) => set({ searchQuery: query }),
    setLimit: (limit) => set((state) => ({ pagination: { ...state.pagination, limit, page: 1 } })),
    setCompanyId: (companyId) => set({ companyId }),
    setFilterCurrency: (currency) => set({ filterCurrency: currency }),
    setFilterCustomerId: (customerId) => set({ filterCustomerId: customerId }),
    setFilterYear: (year) => set({ filterYear: year }),
    setFilterMonth: (month) => set({ filterMonth: month }),

    fetchTransactions: async (page = 1) => {
        set({ loading: true, error: null });
        try {
            const { searchQuery, pagination, companyId, filterCurrency, filterCustomerId, filterYear, filterMonth } = get();
            const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
            if (searchQuery) params.set('search', searchQuery);
            if (companyId) params.set('companyId', String(companyId));
            if (filterCurrency) params.set('currencyCode', filterCurrency);
            if (filterCustomerId) params.set('customerId', filterCustomerId);
            if (filterYear) params.set('year', filterYear);
            if (filterMonth) params.set('month', filterMonth);

            const res = await fetch(`/api/transactions?${params}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            set({ transactions: json.data, pagination: json.pagination });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set({ loading: false });
        }
    },

    fetchTransaction: async (id: number) => {
        const { companyId } = get();
        const params = companyId ? `?companyId=${companyId}` : '';
        const res = await fetch(`/api/transactions/${id}${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch transaction');
        const json = await res.json();
        return json.data;
    },

    createTransaction: async (data) => {
        const { companyId } = get();
        const params = companyId ? `?companyId=${companyId}` : '';
        const res = await fetch(`/api/transactions${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create');
        }
        const json = await res.json();
        return json.data;
    },

    updateTransaction: async (id, data) => {
        const { companyId } = get();
        const params = companyId ? `?companyId=${companyId}` : '';
        const res = await fetch(`/api/transactions/${id}${params}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update');
        }
        const json = await res.json();
        return json.data;
    },

    deleteTransaction: async (id) => {
        const { companyId } = get();
        const params = companyId ? `?companyId=${companyId}` : '';
        const res = await fetch(`/api/transactions/${id}${params}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete');
        }
        await get().fetchTransactions(get().pagination.page);
    },
}));
