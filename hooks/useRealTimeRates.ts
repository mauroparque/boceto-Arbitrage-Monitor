import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
} from 'firebase/firestore';

// Interface matching Firebase priceHistory structure
export interface RealTimeRates {
    // From Firebase priceHistory collection
    usdtArs: number;        // TC USDT/ARS from CriptoYa
    usdtBrl: number;        // TC USDT/BRL from CriptoYa
    brlArs: number;         // TC BRL/ARS (calculated)
    dolarTarjeta: number;   // Dolar tarjeta reference

    // Compatibility fields (derived)
    btcUsdt: number;
    btcArs: number;
    usdtArsDirect: number;
    usdtArsDerived: number;
    spread: number;
}

export interface RateChange {
    usdtArs: number;
    usdtArsDirect: number;
    usdtBrl: number;
    brlArs: number;
}

export interface UseRealTimeRatesResult {
    rates: RealTimeRates | null;
    previousRates: RealTimeRates | null;
    changes: RateChange;
    isConnected: boolean;
    lastUpdated: Date | null;
    error: string | null;
    isLoading: boolean;
    reconnect: () => void;
}

export function useRealTimeRates(): UseRealTimeRatesResult {
    const [rates, setRates] = useState<RealTimeRates | null>(null);
    const [previousRates, setPreviousRates] = useState<RealTimeRates | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Query the latest record from priceHistory collection
        const priceHistoryRef = collection(db, 'priceHistory');
        const q = query(
            priceHistoryRef,
            orderBy('timestamp', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                if (snapshot.empty) {
                    setError('No hay datos de TCs disponibles');
                    setIsLoading(false);
                    return;
                }

                const doc = snapshot.docs[0];
                const data = doc.data();

                // Map Firebase data to RealTimeRates
                const newRates: RealTimeRates = {
                    usdtArs: data.usdtArs || 0,
                    usdtBrl: data.usdtBrl || 0,
                    brlArs: data.brlArs || 0,
                    dolarTarjeta: data.dolarTarjeta || 0,
                    // Compatibility fields
                    btcUsdt: data.btcUsdt || 0,
                    btcArs: data.btcArs || 0,
                    usdtArsDirect: data.usdtArs || 0,
                    usdtArsDerived: data.usdtArsDerived || data.usdtArs || 0,
                    spread: 0,
                };

                setRates(prev => {
                    if (prev) {
                        setPreviousRates(prev);
                    }
                    return newRates;
                });

                // Get timestamp from Firebase
                const timestamp = data.timestamp?.toDate?.() || new Date();
                setLastUpdated(timestamp);
                setIsConnected(true);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching rates from Firebase:', err);
                setError('Error al cargar TCs desde Firebase');
                setIsConnected(false);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Reconnect function (re-subscribe to Firebase)
    const reconnect = () => {
        setError(null);
        setIsLoading(true);
        // The useEffect will re-run if we need to reconnect
        // For now, this is a no-op since Firebase handles reconnection
    };

    // Calculate changes
    const changes: RateChange = {
        usdtArs: rates && previousRates && previousRates.usdtArs > 0
            ? ((rates.usdtArs - previousRates.usdtArs) / previousRates.usdtArs) * 100
            : 0,
        usdtArsDirect: rates && previousRates && previousRates.usdtArsDirect > 0
            ? ((rates.usdtArsDirect - previousRates.usdtArsDirect) / previousRates.usdtArsDirect) * 100
            : 0,
        usdtBrl: rates && previousRates && previousRates.usdtBrl > 0
            ? ((rates.usdtBrl - previousRates.usdtBrl) / previousRates.usdtBrl) * 100
            : 0,
        brlArs: rates && previousRates && previousRates.brlArs > 0
            ? ((rates.brlArs - previousRates.brlArs) / previousRates.brlArs) * 100
            : 0,
    };

    return {
        rates,
        previousRates,
        changes,
        isConnected,
        lastUpdated,
        error,
        isLoading,
        reconnect,
    };
}
