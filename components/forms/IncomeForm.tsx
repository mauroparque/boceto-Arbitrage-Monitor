import React, { useState, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { IncomeFormData } from '../../hooks/useIncome';
import { SourceCurrency } from '../../types';

interface IncomeFormProps {
    initialData?: Partial<IncomeFormData> & { id?: string };
    onSubmit: (data: IncomeFormData) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
    isLoading?: boolean;
    currentTC?: number; // TC actual USDT/BRL para sugerencia
}

const INCOME_CATEGORIES = [
    { value: 'rental', label: 'Alquiler' },
    { value: 'deposit', label: 'Seña' },
    { value: 'other', label: 'Otro' },
] as const;

const SOURCE_CURRENCIES: { value: SourceCurrency; label: string }[] = [
    { value: 'BRL', label: 'BRL (Reales)' },
    { value: 'USDT', label: 'USDT' },
    { value: 'ARS', label: 'ARS (Pesos)' },
];

export const IncomeForm: React.FC<IncomeFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    onDelete,
    isLoading = false,
    currentTC,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [date, setDate] = useState(
        initialData?.date
            ? initialData.date.toDate().toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    // Moneda origen - por defecto BRL (pagos desde Brasil)
    const [sourceCurrency, setSourceCurrency] = useState<SourceCurrency>(
        initialData?.sourceCurrency || 'BRL'
    );

    // Montos según moneda
    const [amountBRL, setAmountBRL] = useState(initialData?.amountBRL?.toString() || '');
    const [amountUSDT, setAmountUSDT] = useState(initialData?.amountUSDT?.toString() || '');
    const [amountARS, setAmountARS] = useState(initialData?.amountARS?.toString() || '');

    // TC al momento de la operación
    const [tcAtOperation, setTcAtOperation] = useState(
        initialData?.tcAtOperation?.toString() || currentTC?.toString() || ''
    );

    const [category, setCategory] = useState<'rental' | 'deposit' | 'other'>(
        initialData?.category || 'rental'
    );
    const [description, setDescription] = useState(initialData?.description || '');
    const [error, setError] = useState<string | null>(null);

    // Cálculo automático de USDT cuando se ingresa BRL + TC
    const calculatedUSDT = useMemo(() => {
        if (sourceCurrency === 'BRL' && amountBRL && tcAtOperation) {
            const brl = parseFloat(amountBRL);
            const tc = parseFloat(tcAtOperation);
            if (brl > 0 && tc > 0) {
                return (brl / tc).toFixed(2);
            }
        }
        return null;
    }, [sourceCurrency, amountBRL, tcAtOperation]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validar según moneda origen
        const primaryAmount = sourceCurrency === 'BRL' ? amountBRL
            : sourceCurrency === 'USDT' ? amountUSDT
                : amountARS;

        if (!primaryAmount || parseFloat(primaryAmount) <= 0) {
            setError('El monto es requerido');
            return;
        }
        if (!description.trim()) {
            setError('La descripción es requerida');
            return;
        }

        // Si es BRL, requerir TC
        if (sourceCurrency === 'BRL' && !tcAtOperation) {
            setError('El tipo de cambio es requerido para pagos en BRL');
            return;
        }

        const data: IncomeFormData = {
            date: Timestamp.fromDate(new Date(date)),
            sourceCurrency,
            amountBRL: sourceCurrency === 'BRL' ? parseFloat(amountBRL) : 0,
            amountUSDT: sourceCurrency === 'USDT'
                ? parseFloat(amountUSDT)
                : calculatedUSDT ? parseFloat(calculatedUSDT) : undefined,
            amountARS: sourceCurrency === 'ARS' ? parseFloat(amountARS) : undefined,
            tcAtOperation: tcAtOperation ? parseFloat(tcAtOperation) : undefined,
            category,
            description: description.trim(),
            isConfirmed: initialData?.isConfirmed ?? true,
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

            {/* Source Currency */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Moneda de origen *</label>
                <select
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value as SourceCurrency)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                    {SOURCE_CURRENCIES.map((curr) => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                    ))}
                </select>
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

            {/* Amount - Dynamic based on currency */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">
                    Monto ({sourceCurrency}) *
                </label>
                <input
                    type="number"
                    value={sourceCurrency === 'BRL' ? amountBRL : sourceCurrency === 'USDT' ? amountUSDT : amountARS}
                    onChange={(e) => {
                        if (sourceCurrency === 'BRL') setAmountBRL(e.target.value);
                        else if (sourceCurrency === 'USDT') setAmountUSDT(e.target.value);
                        else setAmountARS(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* TC - Only for BRL */}
            {sourceCurrency === 'BRL' && (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">
                        TC USDT/BRL al momento *
                    </label>
                    <input
                        type="number"
                        value={tcAtOperation}
                        onChange={(e) => setTcAtOperation(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ej: 5.56"
                        step="0.001"
                    />
                    {calculatedUSDT && (
                        <p className="mt-1 text-xs text-emerald-400">
                            ≈ {calculatedUSDT} USDT
                        </p>
                    )}
                </div>
            )}

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

            {/* Delete button (only when editing) */}
            {initialData?.id && onDelete && (
                showDeleteConfirm ? (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300 mb-3">¿Eliminar este ingreso?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full mt-4 text-red-400 hover:text-red-300 text-sm"
                        disabled={isLoading}
                    >
                        Eliminar ingreso
                    </button>
                )
            )}
        </form>
    );
};
