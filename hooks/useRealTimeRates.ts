import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceWS, TickerUpdate } from '../services/binanceWebSocket';

export interface RealTimeRates {
    // Raw prices from Binance
    btcUsdt: number;
    btcArs: number;
    usdtBrl: number;
    usdtArsDirect: number;  // Direct USDTARS pair

    // Calculated TCs (what the user wants)
    usdtArs: number;        // Derived: BTC/ARS ÷ BTC/USDT
    usdtArsDerived: number; // Same as above, for clarity
    brlArs: number;         // Cuántos ARS cuesta 1 BRL

    // Spread between direct and derived
    spread: number;         // % difference between direct and derived
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
    reconnect: () => void;
}

export function useRealTimeRates(): UseRealTimeRatesResult {
    const [rates, setRates] = useState<RealTimeRates | null>(null);
    const [previousRates, setPreviousRates] = useState<RealTimeRates | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use refs to store latest prices without triggering re-renders on every tick
    const pricesRef = useRef({
        btcUsdt: 0,
        btcArs: 0,
        usdtBrl: 0,
        usdtArsDirect: 0,
    });

    // Throttle updates to avoid excessive re-renders (update every 500ms max)
    const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const calculateRates = useCallback(() => {
        const { btcUsdt, btcArs, usdtBrl, usdtArsDirect } = pricesRef.current;

        // Only calculate if we have the minimum prices (direct USDT/ARS is optional)
        if (btcUsdt === 0 || btcArs === 0 || usdtBrl === 0) {
            return null;
        }

        // TC USDT/ARS Derived = BTC/ARS ÷ BTC/USDT
        const usdtArsDerived = btcArs / btcUsdt;

        // TC BRL/ARS = USDT/ARS ÷ USDT/BRL
        const brlArs = usdtArsDerived / usdtBrl;

        // Spread calculation (if direct rate is available)
        // Positive spread = direct is higher (you get more selling direct)
        // Negative spread = derived is higher (you get more via BTC route)
        const spread = usdtArsDirect > 0
            ? ((usdtArsDirect - usdtArsDerived) / usdtArsDerived) * 100
            : 0;

        return {
            btcUsdt,
            btcArs,
            usdtBrl,
            usdtArsDirect,
            usdtArs: usdtArsDerived,  // Default to derived for backwards compatibility
            usdtArsDerived,
            brlArs,
            spread,
        };
    }, []);

    const updateRates = useCallback(() => {
        const newRates = calculateRates();
        if (newRates) {
            setRates(prev => {
                if (prev) {
                    setPreviousRates(prev);
                }
                return newRates;
            });
            setLastUpdated(new Date());
        }
    }, [calculateRates]);

    const handleTickerUpdate = useCallback((update: TickerUpdate) => {
        // Update the ref with latest price
        if (update.symbol === 'btcusdt') {
            pricesRef.current.btcUsdt = update.price;
        } else if (update.symbol === 'btcars') {
            pricesRef.current.btcArs = update.price;
        } else if (update.symbol === 'usdtbrl') {
            pricesRef.current.usdtBrl = update.price;
        } else if (update.symbol === 'usdtars') {
            pricesRef.current.usdtArsDirect = update.price;
        }
    }, []);

    const reconnect = useCallback(() => {
        setError(null);
        binanceWS.connect().catch(err => {
            setError('Error al conectar con Binance. Reintentando...');
            console.error(err);
        });
    }, []);

    useEffect(() => {
        // Set up connection status callback
        binanceWS.setConnectionStatusCallback(setIsConnected);

        // Connect to WebSocket
        binanceWS.connect().catch(err => {
            setError('Error al conectar con Binance');
            console.error(err);
        });

        // Subscribe to all symbols
        const unsubBtcUsdt = binanceWS.subscribe('btcusdt', handleTickerUpdate);
        const unsubBtcArs = binanceWS.subscribe('btcars', handleTickerUpdate);
        const unsubUsdtBrl = binanceWS.subscribe('usdtbrl', handleTickerUpdate);
        const unsubUsdtArs = binanceWS.subscribe('usdtars', handleTickerUpdate);

        // Set up throttled update interval (update UI every 500ms)
        updateIntervalRef.current = setInterval(updateRates, 500);

        return () => {
            unsubBtcUsdt();
            unsubBtcArs();
            unsubUsdtBrl();
            unsubUsdtArs();
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
        };
    }, [handleTickerUpdate, updateRates]);

    // Calculate changes
    const changes: RateChange = {
        usdtArs: rates && previousRates ? ((rates.usdtArs - previousRates.usdtArs) / previousRates.usdtArs) * 100 : 0,
        usdtArsDirect: rates && previousRates && previousRates.usdtArsDirect > 0
            ? ((rates.usdtArsDirect - previousRates.usdtArsDirect) / previousRates.usdtArsDirect) * 100
            : 0,
        usdtBrl: rates && previousRates ? ((rates.usdtBrl - previousRates.usdtBrl) / previousRates.usdtBrl) * 100 : 0,
        brlArs: rates && previousRates ? ((rates.brlArs - previousRates.brlArs) / previousRates.brlArs) * 100 : 0,
    };

    return {
        rates,
        previousRates,
        changes,
        isConnected,
        lastUpdated,
        error,
        reconnect,
    };
}
