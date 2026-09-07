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

    const fetchRate = useCallback(async (currency: string, date: string) => {
        if (!currency || !date || currency === 'THB') {
            if (currency === 'THB') {
                setRate({
                    currencyId: 'THB',
                    period: date,
                    buyingTransfer: '1.000000',
                    selling: '1.000000',
                    source: 'SYSTEM',
                });
            }
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/rates/bot-fallback/${currency}/${date}`, {
                credentials: 'include',
            });
            const json = await res.json();

            if (res.ok && json.data) {
                setRate(json.data);
            } else {
                setError(json.error || 'Rate not available');
                setRate(null);
            }
        } catch {
            setError('Failed to fetch exchange rate');
            setRate(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearRate = useCallback(() => {
        setRate(null);
        setError(null);
    }, []);

    return { rate, loading, error, fetchRate, clearRate };
}
