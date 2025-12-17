import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { IncomeFormData } from '../../hooks/useIncome';

interface IncomeFormProps {
    initialData?: Partial<IncomeFormData>;
    onSubmit: (data: IncomeFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

const INCOME_CATEGORIES = [
    { value: 'rental', label: 'Alquiler' },
    { value: 'deposit', label: 'Seña' },
    { value: 'other', label: 'Otro' },
] as const;

export const IncomeForm: React.FC<IncomeFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [date, setDate] = useState(
        initialData?.date
            ? initialData.date.toDate().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [amountBRL, setAmountBRL] = useState(initialData?.amountBRL?.toString() || '');
    const [category, setCategory] = useState<'rental' | 'deposit' | 'other'>(
        initialData?.category || 'rental'
    );
    const [description, setDescription] = useState(initialData?.description || '');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!amountBRL || parseFloat(amountBRL) <= 0) {
            setError('El monto es requerido');
            return;
        }
        if (!description.trim()) {
            setError('La descripción es requerida');
            return;
        }

        const data: IncomeFormData = {
            date: Timestamp.fromDate(new Date(date)),
            amountBRL: parseFloat(amountBRL),
            category,
            description: description.trim(),
            isConfirmed: initialData?.isConfirmed ?? true, // Default to true for manual entries
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
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo *</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'rental' | 'deposit' | 'other')}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                    {INCOME_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Monto (BRL) *</label>
                <input
                    type="number"
                    value={amountBRL}
                    onChange={(e) => setAmountBRL(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción *</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Ej: Seña reserva 15/12 - 20/12"
                />
            </div>

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
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </form>
    );
};
