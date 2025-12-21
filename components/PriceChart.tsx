import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, LineSeries } from 'lightweight-charts';
import { usePriceHistory, TimeRange, TCType } from '../hooks/usePriceHistory';

interface PriceChartProps {
    className?: string;
}

const TC_OPTIONS: { value: TCType; label: string; color: string }[] = [
    { value: 'brlArs', label: 'BRL → ARS', color: '#10b981' },
    { value: 'usdtArs', label: 'USDT → ARS (Derivado)', color: '#3b82f6' },
    { value: 'usdtBrl', label: 'USDT → BRL', color: '#f59e0b' },
];

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: '1w', label: '1 Semana' },
    { value: '1m', label: '1 Mes' },
];

export const PriceChart: React.FC<PriceChartProps> = ({ className }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

    const [selectedTC, setSelectedTC] = React.useState<TCType>('brlArs');
    const [timeRange, setTimeRange] = React.useState<TimeRange>('1w');

    const { chartData, isLoading, error, weeklyAverage, currentVsAverage } = usePriceHistory(timeRange, selectedTC);

    const selectedTCConfig = TC_OPTIONS.find(tc => tc.value === selectedTC) || TC_OPTIONS[0];

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(51, 65, 85, 0.3)' },
                horzLines: { color: 'rgba(51, 65, 85, 0.3)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#334155',
            },
            rightPriceScale: {
                borderColor: '#334155',
            },
            crosshair: {
                vertLine: { color: '#64748b', labelBackgroundColor: '#334155' },
                horzLine: { color: '#64748b', labelBackgroundColor: '#334155' },
            },
        });

        // Use new v5 API: addSeries instead of addLineSeries
        const series = chart.addSeries(LineSeries, {
            color: selectedTCConfig.color,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 4,
                minMove: 0.0001,
            },
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update series color when TC changes
    useEffect(() => {
        if (seriesRef.current) {
            seriesRef.current.applyOptions({ color: selectedTCConfig.color });
        }
    }, [selectedTCConfig.color]);

    // Update chart data
    useEffect(() => {
        if (seriesRef.current && chartData.length > 0) {
            // Convert to line data format for lightweight-charts v5
            const lineData = chartData.map(point => ({
                time: point.time as number,
                value: point.value,
            }));
            seriesRef.current.setData(lineData);
            chartRef.current?.timeScale().fitContent();
        }
    }, [chartData]);

    return (
        <div className={`bg-stone-900/50 rounded-xl border border-stone-700/50 p-6 ${className}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">Historial de Precios</h3>
                    <p className="text-xs text-stone-400">Datos cada 15 minutos</p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-2">
                    {/* TC Selector */}
                    <select
                        value={selectedTC}
                        onChange={(e) => setSelectedTC(e.target.value as TCType)}
                        className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm focus:outline-none focus:border-stone-500"
                    >
                        {TC_OPTIONS.map(tc => (
                            <option key={tc.value} value={tc.value}>{tc.label}</option>
                        ))}
                    </select>

                    {/* Time Range */}
                    <div className="flex rounded-lg overflow-hidden border border-stone-700">
                        {TIME_RANGE_OPTIONS.map(tr => (
                            <button
                                key={tr.value}
                                onClick={() => setTimeRange(tr.value)}
                                className={`px-3 py-2 text-sm transition-colors ${timeRange === tr.value
                                        ? 'bg-stone-700 text-white'
                                        : 'bg-stone-800 text-stone-400 hover:text-white'
                                    }`}
                            >
                                {tr.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            {weeklyAverage !== null && (
                <div className="flex flex-wrap gap-4 mb-4 text-xs">
                    <div className="bg-stone-800/50 px-3 py-2 rounded-lg">
                        <span className="text-stone-500">Promedio Semanal: </span>
                        <span className="text-stone-300 font-mono">{weeklyAverage.toFixed(4)}</span>
                    </div>
                    {currentVsAverage !== null && (
                        <div className={`px-3 py-2 rounded-lg ${currentVsAverage > 0 ? 'bg-amber-900/30' : currentVsAverage < 0 ? 'bg-red-900/30' : 'bg-stone-800/50'
                            }`}>
                            <span className="text-stone-500">vs Promedio: </span>
                            <span className={`font-mono ${currentVsAverage > 0 ? 'text-amber-400' : currentVsAverage < 0 ? 'text-red-400' : 'text-stone-300'
                                }`}>
                                {currentVsAverage > 0 ? '+' : ''}{currentVsAverage.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Chart Container */}
            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 z-10">
                        <div className="text-stone-400">Cargando historial...</div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 z-10">
                        <div className="text-red-400">{error}</div>
                    </div>
                )}
                {!isLoading && chartData.length === 0 && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 z-10">
                        <div className="text-center text-stone-400">
                            <p>No hay datos históricos aún</p>
                            <p className="text-xs mt-1">El historial se construye con n8n cada 15 minutos</p>
                        </div>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full" style={{ minHeight: 300 }} />
            </div>
        </div>
    );
};
