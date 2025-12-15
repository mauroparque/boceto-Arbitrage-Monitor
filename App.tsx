import React, { useState, useEffect } from 'react';
import { useRealTimeRates } from './hooks/useRealTimeRates';
import { StatCard } from './components/StatCard';

// localStorage keys
const STORAGE_KEYS = {
  USDT_BALANCE: 'fiwind_usdt_balance',
  BRL_AMOUNT: 'arbitrage_brl_amount',
};

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

const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const ArbitrageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5" />
    <path d="M8 3H3v5" />
    <path d="M21 3l-7 7" />
    <path d="M3 3l7 7" />
    <path d="M16 21h5v-5" />
    <path d="M8 21H3v-5" />
    <path d="M21 21l-7-7" />
    <path d="M3 21l7-7" />
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

  // Load from localStorage on mount
  const [usdtBalance, setUsdtBalance] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.USDT_BALANCE) || '';
  });
  const [brlAmount, setBrlAmount] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.BRL_AMOUNT) || '';
  });

  // Parse values for calculations
  const parsedBalance = parseFloat(usdtBalance) || 0;
  const parsedBrl = parseFloat(brlAmount) || 0;

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USDT_BALANCE, usdtBalance);
  }, [usdtBalance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRL_AMOUNT, brlAmount);
  }, [brlAmount]);

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

  // Arbitrage calculations
  const arbitrageCalc = rates && parsedBrl > 0 ? {
    // Step 1: BRL → USDT (comprar USDT con BRL)
    usdtFromBrl: parsedBrl / rates.usdtBrl,
    // Step 2: USDT → ARS (vender USDT por ARS)
    arsFromUsdt: (parsedBrl / rates.usdtBrl) * rates.usdtArs,
    // Direct comparison: BRL → ARS directo
    arsDirectFromBrl: parsedBrl * rates.brlArs,
  } : null;

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

        {/* Main Grid - 4 TCs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Card 1: USDT → ARS (Derivado) */}
          <StatCard
            title="USDT → ARS (Derivado)"
            value={rates ? formatCurrency(rates.usdtArsDerived, 'ARS') : '---'}
            subValue="Vía BTC"
            change={formatChange(changes.usdtArs)}
            icon={<DollarIcon />}
            description="BTC/ARS ÷ BTC/USDT"
          />

          {/* Card 2: USDT → ARS (Directo) */}
          <StatCard
            title="USDT → ARS (Directo)"
            value={rates && rates.usdtArsDirect > 0 ? formatCurrency(rates.usdtArsDirect, 'ARS') : '---'}
            subValue="Par USDTARS"
            change={formatChange(changes.usdtArsDirect)}
            icon={<DollarIcon />}
            description="Cotización directa Binance"
          />

          {/* Card 3: USDT → BRL */}
          <StatCard
            title="USDT → BRL"
            value={rates ? formatCurrency(rates.usdtBrl, 'BRL') : '---'}
            subValue="Binance Spot"
            change={formatChange(changes.usdtBrl)}
            icon={<BrazilIcon />}
            description="Cotización directa USDT/BRL"
          />

          {/* Card 4: BRL → ARS (Highlighted) */}
          <StatCard
            title="BRL → ARS"
            value={rates ? formatCurrency(rates.brlArs, 'ARS') : '---'}
            subValue="TC Implícito"
            change={formatChange(changes.brlArs)}
            icon={<ArrowRightIcon />}
            description="(USDT/ARS) ÷ (USDT/BRL)"
            highlight={true}
          />
        </div>

        {/* Spread Indicator */}
        {rates && rates.usdtArsDirect > 0 && (
          <div className={`mt-4 p-4 rounded-lg border ${rates.spread > 0
              ? 'bg-emerald-900/20 border-emerald-500/30'
              : rates.spread < 0
                ? 'bg-amber-900/20 border-amber-500/30'
                : 'bg-slate-800/50 border-slate-700/50'
            }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Spread Directo vs Derivado:</span>
                <span className={`text-lg font-bold font-mono ${rates.spread > 0 ? 'text-emerald-400' : rates.spread < 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                  {rates.spread > 0 ? '+' : ''}{rates.spread.toFixed(3)}%
                </span>
              </div>
              <div className={`text-xs px-3 py-1 rounded-full ${rates.spread > 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : rates.spread < 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                {rates.spread > 0
                  ? '✓ Mejor vender USDT directo'
                  : rates.spread < 0
                    ? '✓ Mejor ruta vía BTC'
                    : 'Sin diferencia'}
              </div>
            </div>
          </div>
        )}

        {/* Fiwind Balance Section */}
        <div className="mt-8 p-6 bg-gradient-to-br from-violet-900/30 to-indigo-900/30 rounded-xl border border-violet-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-500/20 rounded-lg text-violet-300">
              <WalletIcon />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Mi Balance Fiwind</h3>
              <p className="text-xs text-violet-300">Ingresá tus USDT para calcular equivalencias</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Input */}
            <div className="flex-1">
              <label className="block text-xs text-violet-300 mb-2 uppercase tracking-wider">Cantidad USDT</label>
              <div className="relative">
                <input
                  type="number"
                  value={usdtBalance}
                  onChange={(e) => setUsdtBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-violet-500/30 rounded-lg text-white text-xl font-mono focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 placeholder-slate-600"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 font-medium">USDT</span>
              </div>
            </div>

            {/* Calculated Values */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <span className="block text-xs text-slate-500 mb-1">Equivalente ARS</span>
                <span className="text-xl font-bold text-emerald-400">
                  {rates && parsedBalance > 0
                    ? `$${(parsedBalance * rates.usdtArs).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                    : '---'}
                </span>
                <span className="block text-xs text-slate-600 mt-1">ARS</span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <span className="block text-xs text-slate-500 mb-1">Equivalente BRL</span>
                <span className="text-xl font-bold text-amber-400">
                  {rates && parsedBalance > 0
                    ? `R$${(parsedBalance * rates.usdtBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '---'}
                </span>
                <span className="block text-xs text-slate-600 mt-1">BRL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Arbitrage Simulator Section */}
        <div className="mt-8 p-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-300">
              <ArbitrageIcon />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Simulador de Arbitraje</h3>
              <p className="text-xs text-amber-300">Calculá la ruta BRL → USDT → ARS</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Input BRL */}
            <div className="max-w-md">
              <label className="block text-xs text-amber-300 mb-2 uppercase tracking-wider">Cantidad BRL inicial</label>
              <div className="relative">
                <input
                  type="number"
                  value={brlAmount}
                  onChange={(e) => setBrlAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-amber-500/30 rounded-lg text-white text-xl font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 placeholder-slate-600"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-medium">BRL</span>
              </div>
            </div>

            {/* Arbitrage Flow */}
            {arbitrageCalc && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: BRL → USDT */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs font-bold text-black">1</div>
                  <span className="block text-xs text-slate-500 mb-1">BRL → USDT</span>
                  <span className="text-lg font-bold text-white">
                    {arbitrageCalc.usdtFromBrl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-amber-400 ml-1">USDT</span>
                  <span className="block text-xs text-slate-600 mt-1">
                    @ R${rates?.usdtBrl.toFixed(2)}/USDT
                  </span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>

                {/* Step 2: USDT → ARS */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-emerald-500/30 relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold text-black">2</div>
                  <span className="block text-xs text-slate-500 mb-1">USDT → ARS</span>
                  <span className="text-lg font-bold text-emerald-400">
                    ${arbitrageCalc.arsFromUsdt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-emerald-400 ml-1">ARS</span>
                  <span className="block text-xs text-slate-600 mt-1">
                    @ ${rates?.usdtArs.toFixed(2)}/USDT
                  </span>
                </div>
              </div>
            )}

            {/* Summary */}
            {arbitrageCalc && (
              <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 p-4 rounded-lg border border-emerald-500/30">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="block text-xs text-emerald-300 uppercase tracking-wider mb-1">Resultado Final</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">
                        R${parsedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-2xl font-bold text-white">
                        ${arbitrageCalc.arsFromUsdt.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 mb-1">TC Efectivo BRL/ARS</span>
                    <span className="text-xl font-mono text-emerald-400">
                      {(arbitrageCalc.arsFromUsdt / parsedBrl).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
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