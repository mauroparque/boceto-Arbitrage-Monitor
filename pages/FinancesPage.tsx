import React, { useState, useMemo } from 'react';
import { useExpenses, ExpenseFormData } from '../hooks/useExpenses';
import { useIncome, IncomeFormData } from '../hooks/useIncome';
import { useBookings } from '../hooks/useBookings';
import { useRealTimeRates } from '../hooks/useRealTimeRates';
import { ExpenseForm } from '../components/forms/ExpenseForm';
import { IncomeForm } from '../components/forms/IncomeForm';
import { Expense, Income, Booking, EXPENSE_CATEGORIES } from '../types';

type Tab = 'income' | 'expenses' | 'pending-expenses' | 'pending-income';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const FinancesPage: React.FC = () => {
    const { expenses, isLoading: expensesLoading, addExpense, updateExpense, deleteExpense, getPendingExpenses } = useExpenses();
    const { incomes, isLoading: incomesLoading, addIncome, updateIncome, deleteIncome } = useIncome();
    const { bookings, isLoading: bookingsLoading } = useBookings();
    const { rates } = useRealTimeRates();

    const [activeTab, setActiveTab] = useState<Tab>('income');
    const [filterByMonth, setFilterByMonth] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('income');
    const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Filter data based on month toggle
    const filteredIncomes = useMemo(() => {
        if (!filterByMonth) return incomes;
        return incomes.filter((inc) => {
            const date = inc.date.toDate();
            return date.getFullYear() === year && date.getMonth() === month;
        });
    }, [incomes, filterByMonth, year, month]);

    const filteredExpenses = useMemo(() => {
        if (!filterByMonth) return expenses;
        return expenses.filter((exp) => {
            const date = exp.date.toDate();
            return date.getFullYear() === year && date.getMonth() === month;
        });
    }, [expenses, filterByMonth, year, month]);

    const pendingExpenses = useMemo(() => getPendingExpenses(), [expenses]);

    // Pending income from confirmed bookings (not yet completed)
    const pendingIncomeFromBookings = useMemo(() => {
        return bookings
            .filter((b) => b.status === 'confirmed')
            .map((b) => ({
                booking: b,
                remainingAmount: b.remainingAmount,
                checkIn: b.checkIn,
            }));
    }, [bookings]);

    const totalPendingIncome = useMemo(() =>
        pendingIncomeFromBookings.reduce((sum, p) => sum + p.remainingAmount, 0),
        [pendingIncomeFromBookings]
    );

    // Totals
    const totalIncome = filteredIncomes.reduce((sum, inc) => sum + inc.amountBRL, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amountBRL, 0);
    const balance = totalIncome - totalExpenses;

    // Currency conversions
    const convertToARS = (brl: number) => rates ? brl * rates.brlArs : null;
    const convertToUSDT = (brl: number) => rates ? brl / rates.usdtBrl : null;

    const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
        { id: 'income', label: 'Ingresos', icon: '💰', count: filteredIncomes.length },
        { id: 'expenses', label: 'Gastos', icon: '💸', count: filteredExpenses.length },
        { id: 'pending-expenses', label: 'Gastos Pendientes', icon: '⏰', count: pendingExpenses.length },
        { id: 'pending-income', label: 'Por Cobrar', icon: '📥', count: pendingIncomeFromBookings.length },
    ];

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
    };

    const openAddModal = (type: 'income' | 'expense') => {
        setModalType(type);
        setSelectedIncome(null);
        setSelectedExpense(null);
        setShowModal(true);
    };

    const handleIncomeSubmit = async (data: IncomeFormData) => {
        setIsSubmitting(true);
        try {
            if (selectedIncome) {
                await updateIncome(selectedIncome.id, data);
            } else {
                await addIncome(data);
            }
            setShowModal(false);
            setSelectedIncome(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteIncome = async () => {
        if (!selectedIncome) return;
        setIsSubmitting(true);
        try {
            await deleteIncome(selectedIncome.id);
            setShowModal(false);
            setSelectedIncome(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExpenseSubmit = async (data: ExpenseFormData) => {
        setIsSubmitting(true);
        try {
            if (selectedExpense) {
                await updateExpense(selectedExpense.id, data);
            } else {
                await addExpense(data);
            }
            setShowModal(false);
            setSelectedExpense(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkAsPaid = async (expense: Expense) => {
        await updateExpense(expense.id, { isPaid: true });
    };

    const formatDate = (date: Date) => {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    const isLoading = expensesLoading || incomesLoading || bookingsLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Finanzas</h2>
                    <p className="text-slate-400 text-sm">Ingresos y gastos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openAddModal('income')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        + Ingreso
                    </button>
                    <button
                        onClick={() => openAddModal('expense')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        + Gasto
                    </button>
                </div>
            </div>

            {/* Month Filter Toggle */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterByMonth}
                            onChange={(e) => setFilterByMonth(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-300">Filtrar por mes</span>
                    </label>
                </div>
                {filterByMonth && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            ←
                        </button>
                        <h3 className="text-lg font-semibold text-white min-w-[150px] text-center">
                            {MONTHS[month]} {year}
                        </h3>
                        <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/30">
                    <p className="text-xs text-slate-500 mb-1">{filterByMonth ? 'Ingresos del mes' : 'Total ingresos'}</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {rates && (
                        <p className="text-xs text-slate-500 mt-1">
                            ≈ ${convertToARS(totalIncome)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                        </p>
                    )}
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/30">
                    <p className="text-xs text-slate-500 mb-1">{filterByMonth ? 'Gastos del mes' : 'Total gastos'}</p>
                    <p className="text-2xl font-bold text-red-400">
                        R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {rates && (
                        <p className="text-xs text-slate-500 mt-1">
                            ≈ ${convertToARS(totalExpenses)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                        </p>
                    )}
                </div>
                <div className={`bg-slate-800/50 rounded-xl p-4 border ${balance >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                    <p className="text-xs text-slate-500 mb-1">Balance</p>
                    <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {rates && (
                        <p className="text-xs text-slate-500 mt-1">
                            ≈ {convertToUSDT(balance)?.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                        </p>
                    )}
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
                    <p className="text-xs text-slate-500 mb-1">Por cobrar (check-ins)</p>
                    <p className="text-2xl font-bold text-amber-400">
                        R$ {totalPendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {rates && (
                        <p className="text-xs text-slate-500 mt-1">
                            ≈ ${convertToARS(totalPendingIncome)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                        </p>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 bg-slate-800/50 p-1 rounded-lg w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="px-1.5 py-0.5 text-xs bg-slate-600 rounded-full">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32 text-slate-400">
                    Cargando...
                </div>
            ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                    {/* Income Tab */}
                    {activeTab === 'income' && (
                        filteredIncomes.length === 0 ? (
                            <p className="text-slate-500 text-center py-12">No hay ingresos registrados</p>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {filteredIncomes.map((income) => (
                                    <div
                                        key={income.id}
                                        className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedIncome(income);
                                            setModalType('income');
                                            setShowModal(true);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-medium">{income.description}</p>
                                                    {income.bookingId && (
                                                        <span className="text-xs px-2 py-0.5 bg-emerald-900/50 rounded text-emerald-300">
                                                            🔗 Reserva
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(income.date.toDate())} • {
                                                        income.category === 'rental' ? 'Alquiler' :
                                                            income.category === 'deposit' ? 'Seña' : 'Otro'
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-emerald-400 font-semibold">
                                                    +R$ {income.amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                {rates && (
                                                    <p className="text-xs text-slate-500">
                                                        ≈ ${convertToARS(income.amountBRL)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* Expenses Tab */}
                    {activeTab === 'expenses' && (
                        filteredExpenses.length === 0 ? (
                            <p className="text-slate-500 text-center py-12">No hay gastos registrados</p>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {filteredExpenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedExpense(expense);
                                            setModalType('expense');
                                            setShowModal(true);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{expense.description}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                                                        {EXPENSE_CATEGORIES[expense.category]}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {formatDate(expense.date.toDate())}
                                                    </span>
                                                    {expense.isRecurring && (
                                                        <span className="text-xs text-amber-400">🔄 Recurrente</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-red-400 font-semibold">
                                                    -R$ {expense.amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                <span className={`text-xs ${expense.isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {expense.isPaid ? '✓ Pagado' : 'Pendiente'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* Pending Expenses Tab */}
                    {activeTab === 'pending-expenses' && (
                        pendingExpenses.length === 0 ? (
                            <p className="text-slate-500 text-center py-12">No hay gastos pendientes de pago 🎉</p>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {pendingExpenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="p-4 hover:bg-slate-700/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{expense.description}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                                                        {EXPENSE_CATEGORIES[expense.category]}
                                                    </span>
                                                    {expense.dueDate && (
                                                        <span className="text-xs text-amber-400">
                                                            Vence: {formatDate(expense.dueDate.toDate())}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-amber-400 font-semibold">
                                                        R$ {expense.amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsPaid(expense);
                                                    }}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
                                                >
                                                    Marcar pagado
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* Pending Income (from confirmed bookings) */}
                    {activeTab === 'pending-income' && (
                        pendingIncomeFromBookings.length === 0 ? (
                            <p className="text-slate-500 text-center py-12">No hay ingresos pendientes de check-in</p>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {pendingIncomeFromBookings.map((item) => (
                                    <div
                                        key={item.booking.id}
                                        className="p-4 hover:bg-slate-700/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">
                                                    Restante reserva - {item.booking.guestName || formatDate(item.checkIn.toDate())}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs px-2 py-0.5 bg-amber-900/50 rounded text-amber-300">
                                                        ⏰ Check-in: {formatDate(item.checkIn.toDate())}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        Seña pagada
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-amber-400 font-semibold">
                                                    R$ {item.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                {rates && (
                                                    <p className="text-xs text-slate-500">
                                                        ≈ ${convertToARS(item.remainingAmount)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-white">
                                    {modalType === 'income'
                                        ? (selectedIncome ? 'Editar ingreso' : 'Nuevo ingreso')
                                        : (selectedExpense ? 'Editar gasto' : 'Nuevo gasto')
                                    }
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedIncome(null);
                                        setSelectedExpense(null);
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {modalType === 'income' ? (
                                <IncomeForm
                                    initialData={selectedIncome ? { ...selectedIncome, id: selectedIncome.id } : undefined}
                                    onSubmit={handleIncomeSubmit}
                                    onCancel={() => {
                                        setShowModal(false);
                                        setSelectedIncome(null);
                                    }}
                                    onDelete={selectedIncome ? handleDeleteIncome : undefined}
                                    isLoading={isSubmitting}
                                />
                            ) : (
                                <ExpenseForm
                                    initialData={selectedExpense || undefined}
                                    onSubmit={handleExpenseSubmit}
                                    onCancel={() => {
                                        setShowModal(false);
                                        setSelectedExpense(null);
                                    }}
                                    isLoading={isSubmitting}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
