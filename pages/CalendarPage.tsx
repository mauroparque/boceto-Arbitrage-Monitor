import React from 'react';

export const CalendarPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Calendario</h2>
                    <p className="text-slate-400 text-sm">Gestión de reservas</p>
                </div>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium">
                    + Nueva reserva
                </button>
            </div>

            {/* Calendar Placeholder */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                <p className="text-slate-500 text-center py-12">
                    Calendario en construcción...
                </p>
            </div>
        </div>
    );
};
