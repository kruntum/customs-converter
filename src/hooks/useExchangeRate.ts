import { useState, useCallback } from 'react';

interface ExchangeRateData {
    currencyId: string;
    period: string;
    buyingTransfer: string;
    selling: string | null;
    source: string;
}

export function useExchangeRate() {
    const [rate, setRate] = useState<ExchangeRateData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Customs rate based on declaration date (T-1 rule)
    const fetchCustomsRate = useCallback(async (currency: string, declarationDate: string): Promise<ExchangeRateData | null> => {
        if (!currency || !declarationDate || currency === 'THB') {
            const thbData: ExchangeRateData = {
                currencyId: 'THB',
                period: declarationDate || '',
                buyingTransfer: '1.000000',
                selling: '1.000000',
                source: 'SYSTEM',
            };
            if (currency === 'THB') setRate(thbData);
            return currency === 'THB' ? thbData : null;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/rates/bot-fallback/${currency}/${declarationDate}`, {
                credentials: 'include',
            });
            const json = await res.json();

            if (res.ok && json.data) {
                setRate(json.data);
                return json.data;
            } else {
                setError(json.error || 'Rate not available');
                setRate(null);
                return null;
            }
        } catch {
            setError('Failed to fetch exchange rate');
            setRate(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // 2. Fetch Direct rate for an exact rate date chosen by user (NO T-1 deduction!)
    const fetchDirectRate = useCallback(async (currency: string, rateDate: string): Promise<ExchangeRateData | null> => {
        if (!currency || !rateDate || currency === 'THB') {
            const thbData: ExchangeRateData = {
                currencyId: 'THB',
                period: rateDate || '',
                buyingTransfer: '1.000000',
                selling: '1.000000',
                source: 'SYSTEM',
            };
            if (currency === 'THB') setRate(thbData);
            return currency === 'THB' ? thbData : null;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/rates/direct/${currency}/${rateDate}`, {
                credentials: 'include',
            });
            const json = await res.json();

            if (res.ok && json.data) {
                setRate(json.data);
                return json.data;
            } else {
                setError(json.error || 'Rate not available');
                setRate(null);
                return null;
            }
        } catch {
            setError('Failed to fetch exchange rate');
            setRate(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearRate = useCallback(() => {
        setRate(null);
        setError(null);
    }, []);

    return { 
        rate, 
        loading, 
        error, 
        fetchRate: fetchCustomsRate, 
        fetchCustomsRate, 
        fetchDirectRate, 
        clearRate 
    };
}
