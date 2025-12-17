import React from 'react';

export const DashboardPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400 text-sm">Resumen de tu propiedad</p>
            </div>

            {/* Stats Grid - Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="text-slate-400 text-sm mb-1">Ingresos del mes</p>
                    <p className="text-2xl font-bold text-emerald-400">R$ 0</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="text-slate-400 text-sm mb-1">Gastos del mes</p>
                    <p className="text-2xl font-bold text-red-400">R$ 0</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="text-slate-400 text-sm mb-1">Balance neto</p>
                    <p className="text-2xl font-bold text-white">R$ 0</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <p className="text-slate-400 text-sm mb-1">Ocupación</p>
                    <p className="text-2xl font-bold text-cyan-400">0%</p>
                </div>
            </div>

            {/* Placeholder sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Próximos eventos</h3>
                    <p className="text-slate-500 text-sm">No hay reservas próximas</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Pagos pendientes</h3>
                    <p className="text-slate-500 text-sm">No hay pagos pendientes</p>
                </div>
            </div>
        </div>
    );
};
