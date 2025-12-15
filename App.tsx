import React, { useState, useEffect } from 'react';
import { useRealTimeRates } from './hooks/useRealTimeRates';
import { StatCard } from './components/StatCard';

// Icons
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
);

const DollarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

const BrazilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="M6 12h12" /></svg>
);

const WifiIcon = ({ connected }: { connected: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={connected ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

// Helper to format time ago
const formatTimeAgo = (date: Date | null): string => {
  if (!date) return '--';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'ahora';
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `hace ${minutes}m`;
};

const App: React.FC = () => {
  const { rates, changes, isConnected, lastUpdated, error, reconnect } = useRealTimeRates();
  const [timeAgo, setTimeAgo] = useState('--');

  // Update time ago every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(lastUpdated));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Formatting helpers
  const formatCurrency = (val: number, currency: string, decimals = 2) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const formatChange = (change: number): { text: string; color: string } => {
    if (Math.abs(change) < 0.001) return { text: '', color: '' };
    const sign = change > 0 ? '+' : '';
    return {
      text: `${sign}${change.toFixed(3)}%`,
      color: change > 0 ? 'text-emerald-400' : 'text-red-400',
    };
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
              Tipos de cambio en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <WifiIcon connected={isConnected} />
              <span className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
              {isConnected && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </div>

            {/* Last Updated */}
            <div className="text-right hidden md:block">
              <p className="text-xs text-slate-500 font-mono uppercase">Actualizado</p>
              <p className="text-xs text-slate-300 font-mono">{timeAgo}</p>
            </div>

            {/* Reconnect Button */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700"
                aria-label="Reconectar"
              >
                <RefreshIcon />
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Main Grid - 3 TCs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: USDT → ARS */}
          <StatCard
            title="USDT → ARS"
            value={rates ? formatCurrency(rates.usdtArs, 'ARS') : '---'}
            subValue={rates ? `BTC/ARS: ${formatCurrency(rates.btcArs, 'ARS', 0)}` : ''}
            change={formatChange(changes.usdtArs)}
            icon={<DollarIcon />}
            description="Dólar crypto derivado de BTC/ARS ÷ BTC/USDT"
          />

          {/* Card 2: USDT → BRL */}
          <StatCard
            title="USDT → BRL"
            value={rates ? formatCurrency(rates.usdtBrl, 'BRL') : '---'}
            subValue="Binance Spot"
            change={formatChange(changes.usdtBrl)}
            icon={<BrazilIcon />}
            description="Cotización directa USDT/BRL en Binance"
          />

          {/* Card 3: BRL → ARS (Highlighted) */}
          <StatCard
            title="BRL → ARS"
            value={rates ? formatCurrency(rates.brlArs, 'ARS') : '---'}
            subValue="Tipo de cambio implícito"
            change={formatChange(changes.brlArs)}
            icon={<ArrowRightIcon />}
            description="TC cruzado: (USDT/ARS) ÷ (USDT/BRL)"
            highlight={true}
          />
        </div>

        {/* Raw Data Table */}
        <div className="mt-8 pt-8 border-t border-slate-800">
          <h4 className="text-sm font-medium text-slate-500 mb-4 uppercase tracking-widest">
            Datos de Mercado (Binance)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono text-slate-400">
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
              <span className="block text-slate-600 mb-1">BTC/USDT</span>
              <span className="text-slate-300">
                {rates ? `$${rates.btcUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '---'}
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
              <span className="block text-slate-600 mb-1">BTC/ARS</span>
              <span className="text-slate-300">
                {rates ? `$${rates.btcArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '---'}
              </span>
            </div>
            <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
              <span className="block text-slate-600 mb-1">USDT/BRL</span>
              <span className="text-slate-300">
                {rates ? `R$${rates.usdtBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="mt-4 p-4 bg-slate-900/30 rounded-lg border border-slate-800/50">
          <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Fórmulas</h5>
          <div className="space-y-1 text-xs text-slate-400 font-mono">
            <p><span className="text-slate-500">USDT→ARS =</span> BTC/ARS ÷ BTC/USDT</p>
            <p><span className="text-slate-500">BRL→ARS =</span> USDT/ARS ÷ USDT/BRL</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;