import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { ProjectedExpenseCategory, PROJECTED_EXPENSE_CATEGORIES } from '../../types';
import { ProjectedExpenseFormData } from '../../hooks/useProjectedExpenses';

interface ProjectedExpenseFormProps {
    initialData?: Partial<ProjectedExpenseFormData> & { id?: string };
    onSubmit: (data: ProjectedExpenseFormData) => Promise<void>;
    onCancel: () => void;
    onDelete?: () => Promise<void>;
    isLoading?: boolean;
}

const PRIORITIES = [
    { value: 'alta', label: 'Alta', color: 'text-red-400' },
    { value: 'media', label: 'Media', color: 'text-amber-400' },
    { value: 'baja', label: 'Baja', color: 'text-stone-400' },
] as const;

export const ProjectedExpenseForm: React.FC<ProjectedExpenseFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    onDelete,
    isLoading = false,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [title, setTitle] = useState(initialData?.title || '');
    const [estimatedAmountUSDT, setEstimatedAmountUSDT] = useState(
        initialData?.estimatedAmountUSDT?.toString() || ''
    );
    const [category, setCategory] = useState<ProjectedExpenseCategory>(
        initialData?.category || 'otros'
    );
    const [priority, setPriority] = useState<'alta' | 'media' | 'baja'>(
        initialData?.priority || 'media'
    );
    const [targetDate, setTargetDate] = useState(
        initialData?.targetDate
            ? initialData.targetDate.toDate().toISOString().split('T')[0]
            : ''
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError('El título es requerido');
            return;
        }
        if (!estimatedAmountUSDT || parseFloat(estimatedAmountUSDT) <= 0) {
            setError('El monto estimado es requerido');
            return;
        }

        const data: ProjectedExpenseFormData = {
            title: title.trim(),
            estimatedAmountUSDT: parseFloat(estimatedAmountUSDT),
            category,
            priority,
            targetDate: targetDate ? Timestamp.fromDate(new Date(targetDate)) : undefined,
            status: initialData?.status || 'pendiente',
            notes: notes.trim() || undefined,
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

            {/* Title */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">¿Qué querés comprar/pagar? *</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    placeholder="Ej: TV nueva, arreglo del baño..."
                />
            </div>

            {/* Amount USDT */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">Monto estimado (USDT) *</label>
                <input
                    type="number"
                    value={estimatedAmountUSDT}
                    onChange={(e) => setEstimatedAmountUSDT(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                    step="0.01"
                />
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">Categoría *</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProjectedExpenseCategory)}
                    className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                    {Object.entries(PROJECTED_EXPENSE_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {/* Priority */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">Prioridad</label>
                <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value)}
                            className={`flex-1 px-3 py-2 rounded-lg border transition-colors ${priority === p.value
                                    ? 'bg-stone-700 border-amber-500'
                                    : 'bg-stone-900/50 border-stone-700 hover:border-stone-600'
                                }`}
                        >
                            <span className={p.color}>{p.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Target Date */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">Fecha objetivo (opcional)</label>
                <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm text-stone-400 mb-1">Notas (opcional)</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900/50 border border-stone-700 rounded-lg text-white focus:outline-none focus:border-amber-500 resize-none"
                    rows={2}
                    placeholder="Notas adicionales..."
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
                    disabled={isLoading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                </button>
            </div>

            {/* Delete button (only when editing) */}
            {initialData?.id && onDelete && (
                showDeleteConfirm ? (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-300 mb-3">¿Eliminar este gasto proyectado?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white text-sm rounded-lg"
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
                        Eliminar gasto proyectado
                    </button>
                )
            )}
        </form>
    );
};
