import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllRates } from './services/binanceService';
import { AppState, CalculatedRates } from './types';
import { StatCard } from './components/StatCard';

// Icons
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    error: null,
    lastUpdated: null,
    rates: null,
    calculations: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const rates = await fetchAllRates();
      
      // Calculations based on user prompt logic
      
      // 1. TC USDT/ARS (Crypto Dollar Reference)
      // Formula: BTCARS / BTCUSDT
      const usdtArs = rates.btcArs / rates.btcUsdt;
      
      // 2. TC BRL/USDT (International)
      // Note: API returns USDTBRL (e.g. 5.80). 
      // User formula requires BRL/USDT (e.g. 0.17) to multiply later.
      const brlUsdt = 1 / rates.usdtBrl;

      // 3. TC BRL/ARS Implícito
      // Formula: TC BRL/USDT * TC USDT/ARS
      const brlArs = brlUsdt * usdtArs;

      setState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        rates,
        calculations: {
          usdtArs,
          brlUsdt,
          brlArs
        }
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch data from Binance. Please try again.',
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Formatting helpers
  const formatCurrency = (val: number, currency: string, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const formatNumber = (val: number, decimals = 4) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col items-center justify-center relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/20 to-transparent -z-10 pointer-events-none" />
      
      <div className="w-full max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              FX Arbitrage Monitor
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Optimizing BRL <span className="text-slate-600 px-1">→</span> USDT <span className="text-slate-600 px-1">→</span> ARS
            </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <p className="text-xs text-slate-500 font-mono uppercase">Last Updated</p>
                <p className="text-xs text-slate-300 font-mono">
                  {state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : '--:--:--'}
                </p>
             </div>
             <button
              onClick={fetchData}
              disabled={state.isLoading}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700 disabled:opacity-50"
              aria-label="Refresh Rates"
            >
              <RefreshIcon className={`${state.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-200 text-sm">
            {state.error}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: BRL / USDT */}
          <StatCard 
            title="BRL / USDT (INTL)"
            value={state.calculations ? formatNumber(state.calculations.brlUsdt) : '---'}
            subValue={state.rates ? `Spot: ${formatCurrency(state.rates.usdtBrl, 'BRL')}` : ''}
            icon={<GlobeIcon />}
            description="International Spot Market Rate (1 BRL in USDT)"
          />

          {/* Card 2: USDT / ARS */}
          <StatCard 
            title="USDT / ARS (CRYPTO)"
            value={state.calculations ? formatCurrency(state.calculations.usdtArs, 'ARS') : '---'}
            subValue={state.rates ? `BTC/ARS: ${formatCurrency(state.rates.btcArs, 'ARS', 0)}` : ''}
            icon={<ChartIcon />}
            description="Implied rate derived from BTC/ARS & BTC/USDT"
          />

          {/* Card 3: MAIN RESULT */}
          <StatCard 
            title="Implicit BRL → ARS"
            value={state.calculations ? formatCurrency(state.calculations.brlArs, 'ARS') : '---'}
            subValue="Final Cross-Rate"
            icon={<ArrowRightIcon />}
            description="Effective exchange rate for the complete arbitrage route."
            highlight={true}
          />
        </div>

        {/* Raw Data Table (Optional / Debug) */}
        <div className="mt-8 pt-8 border-t border-slate-800">
            <h4 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-widest">Market Reference Data (Binance)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-400">
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                    <span className="block text-slate-600 mb-1">Pair</span>
                    USDT/BRL
                </div>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                     <span className="block text-slate-600 mb-1">Price</span>
                    {state.rates ? state.rates.usdtBrl : '---'}
                </div>
                 <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                    <span className="block text-slate-600 mb-1">Pair</span>
                    BTC/ARS
                </div>
                <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                     <span className="block text-slate-600 mb-1">Price</span>
                    {state.rates ? state.rates.btcArs.toLocaleString() : '---'}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;