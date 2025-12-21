import React, { useState, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { ExpenseCategory, EXPENSE_CATEGORIES, TargetCurrency } from '../../types';
import { ExpenseFormData } from '../../hooks/useExpenses';

interface ExpenseFormProps {
    initialData?: Partial<ExpenseFormData>;
    onSubmit: (data: ExpenseFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    currentTC?: { usdtBrl: number; usdtArs: number }; // TCs actuales para sugerencia
}

const TARGET_CURRENCIES: { value: TargetCurrency; label: string }[] = [
    { value: 'BRL', label: 'BRL (Reales)' },
    { value: 'ARS', label: 'ARS (Pesos)' },
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
    currentTC,
}) => {
    const [date, setDate] = useState(
        initialData?.date
            ? initialData.date.toDate().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    // Moneda destino - por defecto BRL (gastos en Brasil)
    const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>(
        initialData?.targetCurrency || 'BRL'
    );

    const [amountBRL, setAmountBRL] = useState(initialData?.amountBRL?.toString() || '');
    const [amountARS, setAmountARS] = useState(initialData?.amountARS?.toString() || '');

    // TC al momento del pago
    const [tcAtPayment, setTcAtPayment] = useState(
        initialData?.tcAtPayment?.toString() ||
        (targetCurrency === 'BRL' ? currentTC?.usdtBrl?.toString() : currentTC?.usdtArs?.toString()) || ''
    );

    const [category, setCategory] = useState<ExpenseCategory>(initialData?.category || 'other');
    const [description, setDescription] = useState(initialData?.description || '');
    const [isPaid, setIsPaid] = useState(initialData?.isPaid ?? true);
    const [dueDate, setDueDate] = useState(
        initialData?.dueDate
            ? initialData.dueDate.toDate().toISOString().split('T')[0]
            : ''
    );
    const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring ?? false);
    const [recurringDay, setRecurringDay] = useState(initialData?.recurringDay?.toString() || '');
    const [error, setError] = useState<string | null>(null);

    // Cálculo automático de USDT equivalente
    const calculatedUSDT = useMemo(() => {
        const amount = targetCurrency === 'BRL' ? amountBRL : amountARS;
        if (amount && tcAtPayment) {
            const amt = parseFloat(amount);
            const tc = parseFloat(tcAtPayment);
            if (amt > 0 && tc > 0) {
                return (amt / tc).toFixed(2);
            }
        }
        return null;
    }, [targetCurrency, amountBRL, amountARS, tcAtPayment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const primaryAmount = targetCurrency === 'BRL' ? amountBRL : amountARS;
        if (!primaryAmount || parseFloat(primaryAmount) <= 0) {
            setError('El monto es requerido');
            return;
        }
        if (!description.trim()) {
            setError('La descripción es requerida');
            return;
        }

        const data: ExpenseFormData = {
            date: Timestamp.fromDate(new Date(date)),
            targetCurrency,
            amountBRL: targetCurrency === 'BRL' ? parseFloat(amountBRL) : 0,
            amountARS: targetCurrency === 'ARS' ? parseFloat(amountARS) : undefined,
            amountUSDT: calculatedUSDT ? parseFloat(calculatedUSDT) : undefined,
            tcAtPayment: tcAtPayment ? parseFloat(tcAtPayment) : undefined,
            category,
            description: description.trim(),
            isPaid,
            paidDate: isPaid ? Timestamp.fromDate(new Date(date)) : undefined,
            dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : undefined,
            isRecurring,
            recurringDay: isRecurring && recurringDay ? parseInt(recurringDay) : undefined,
        };

        try {
            await onSubmit(data);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Date */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Fecha *</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                />
            </div>

            {/* Target Currency */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Moneda *</label>
                <select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value as TargetCurrency)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                    {TARGET_CURRENCIES.map((curr) => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                </select>
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Categoría *</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Amount - Dynamic based on currency */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">
                    Monto ({targetCurrency}) *
                </label>
                <input
                    type="number"
                    value={targetCurrency === 'BRL' ? amountBRL : amountARS}
                    onChange={(e) => {
                        if (targetCurrency === 'BRL') setAmountBRL(e.target.value);
                        else setAmountARS(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* TC - Optional for USDT calculation */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">
                    TC USDT/{targetCurrency} (opcional)
                </label>
                <input
                    type="number"
                    value={tcAtPayment}
                    onChange={(e) => setTcAtPayment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder={targetCurrency === 'BRL' ? 'Ej: 5.56' : 'Ej: 1530'}
                    step="0.001"
                />
                {calculatedUSDT && (
                    <p className="mt-1 text-xs text-amber-400">
                        ≈ {calculatedUSDT} USDT
                    </p>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción *</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    placeholder="Ej: Pago condominio diciembre"
                />
            </div>

            {/* Is Paid */}
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={(e) => setIsPaid(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Ya está pagado</span>
                </label>
            </div>

            {/* Due Date (if not paid) */}
            {!isPaid && (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Fecha de vencimiento</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                    />
                </div>
            )}

            {/* Is Recurring */}
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-300">Es gasto recurrente (mensual)</span>
                </label>
            </div>

            {/* Recurring Day */}
            {isRecurring && (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Día del mes que vence</label>
                    <input
                        type="number"
                        value={recurringDay}
                        onChange={(e) => setRecurringDay(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
                        placeholder="1-31"
                        min="1"
                        max="31"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    disabled={isLoading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </form>
    );
};
