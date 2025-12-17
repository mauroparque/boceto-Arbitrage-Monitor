import React, { useState } from 'react';

type Tab = 'income' | 'expenses' | 'pending';

export const FinancesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('income');

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'income', label: 'Ingresos', icon: '💰' },
        { id: 'expenses', label: 'Gastos', icon: '💸' },
        { id: 'pending', label: 'Pendientes', icon: '⏰' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Finanzas</h2>
                    <p className="text-slate-400 text-sm">Ingresos y gastos</p>
                </div>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium">
                    + Agregar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                {activeTab === 'income' && (
                    <p className="text-slate-500 text-center py-12">No hay ingresos registrados</p>
                )}
                {activeTab === 'expenses' && (
                    <p className="text-slate-500 text-center py-12">No hay gastos registrados</p>
                )}
                {activeTab === 'pending' && (
                    <p className="text-slate-500 text-center py-12">No hay pagos pendientes</p>
                )}
            </div>
        </div>
    );
};
