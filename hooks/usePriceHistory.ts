import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    limit
} from 'firebase/firestore';

export interface PriceRecord {
    timestamp: Date;
    btcUsdt: number;
    btcArs: number;
    usdtBrl: number;
    usdtArs: number;
    usdtArsDerived: number;
    brlArs: number;
}

export interface ChartDataPoint {
    time: number; // Unix timestamp in seconds
    value: number;
}

export type TimeRange = '1w' | '1m';
export type TCType = 'usdtArs' | 'usdtBrl' | 'brlArs';

export interface UsePriceHistoryResult {
    history: PriceRecord[];
    chartData: ChartDataPoint[];
    isLoading: boolean;
    error: string | null;
    weeklyAverage: number | null;
    monthlyAverage: number | null;
    currentVsAverage: number | null; // % difference from weekly average
}

export function usePriceHistory(
    timeRange: TimeRange = '1w',
    selectedTC: TCType = 'brlArs'
): UsePriceHistoryResult {
    const [history, setHistory] = useState<PriceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculate the start date based on time range
    const getStartDate = useCallback(() => {
        const now = new Date();
        if (timeRange === '1w') {
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }, [timeRange]);

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const startDate = getStartDate();
        const priceHistoryRef = collection(db, 'priceHistory');

        const q = query(
            priceHistoryRef,
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            orderBy('timestamp', 'asc'),
            limit(3000) // Max ~1 month at 15 min intervals
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const records: PriceRecord[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    records.push({
                        timestamp: data.timestamp.toDate(),
                        btcUsdt: data.btcUsdt || 0,
                        btcArs: data.btcArs || 0,
                        usdtBrl: data.usdtBrl || 0,
                        usdtArs: data.usdtArs || 0,
                        usdtArsDerived: data.usdtArsDerived || 0,
                        brlArs: data.brlArs || 0,
                    });
                });
                setHistory(records);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching price history:', err);
                setError('Error al cargar historial de precios');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [getStartDate]);

    // Transform history to chart data format
    const chartData: ChartDataPoint[] = history.map((record) => ({
        time: Math.floor(record.timestamp.getTime() / 1000),
        value: record[selectedTC] || 0,
    }));

    // Calculate weekly average (last 7 days)
    const weeklyAverage = (() => {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyRecords = history.filter(r => r.timestamp >= oneWeekAgo);
        if (weeklyRecords.length === 0) return null;

        const sum = weeklyRecords.reduce((acc, r) => acc + (r[selectedTC] || 0), 0);
        return sum / weeklyRecords.length;
    })();

    // Calculate monthly average (last 30 days)
    const monthlyAverage = (() => {
        if (history.length === 0) return null;
        const sum = history.reduce((acc, r) => acc + (r[selectedTC] || 0), 0);
        return sum / history.length;
    })();

    // Calculate current vs weekly average (% difference)
    const currentVsAverage = (() => {
        if (!weeklyAverage || history.length === 0) return null;
        const latest = history[history.length - 1];
        if (!latest) return null;
        const currentValue = latest[selectedTC] || 0;
        return ((currentValue - weeklyAverage) / weeklyAverage) * 100;
    })();

    return {
        history,
        chartData,
        isLoading,
        error,
        weeklyAverage,
        monthlyAverage,
        currentVsAverage,
    };
}
