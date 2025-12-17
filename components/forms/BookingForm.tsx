import React, { useState, useEffect, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { BookingFormData, RentalType } from '../../types';

interface BookingFormProps {
    initialData?: Partial<BookingFormData>;
    onSubmit: (data: BookingFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

const PLATFORMS = [
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'booking', label: 'Booking.com' },
    { value: 'direct', label: 'Directo' },
    { value: 'other', label: 'Otro' },
] as const;

const STATUSES = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
] as const;

const RENTAL_TYPES = [
    { value: 'daily', label: 'Temporada (por día)' },
    { value: 'monthly', label: 'Mensual' },
] as const;

// Helper to calculate nights between two dates
const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

// Helper to calculate months between two dates
const calculateMonths = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(1, months); // Minimum 1 month
};

export const BookingForm: React.FC<BookingFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [guestName, setGuestName] = useState(initialData?.guestName || '');
    const [checkIn, setCheckIn] = useState(
        initialData?.checkIn
            ? initialData.checkIn.toDate().toISOString().split('T')[0]
            : ''
    );
    const [checkOut, setCheckOut] = useState(
        initialData?.checkOut
            ? initialData.checkOut.toDate().toISOString().split('T')[0]
            : ''
    );
    const [rentalType, setRentalType] = useState<RentalType>(
        initialData?.rentalType || 'daily'
    );
    const [dailyRate, setDailyRate] = useState(initialData?.dailyRate?.toString() || '');
    const [monthlyRate, setMonthlyRate] = useState(initialData?.monthlyRate?.toString() || '');
    const [platform, setPlatform] = useState<BookingFormData['platform']>(
        initialData?.platform || 'direct'
    );
    const [status, setStatus] = useState<BookingFormData['status']>(
        initialData?.status || 'confirmed'
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [error, setError] = useState<string | null>(null);

    // Calculate nights and months
    const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
    const months = useMemo(() => calculateMonths(checkIn, checkOut), [checkIn, checkOut]);

    // Calculate total based on rental type
    const totalBRL = useMemo(() => {
        if (rentalType === 'daily') {
            const rate = parseFloat(dailyRate) || 0;
            return rate * nights;
        } else {
            const rate = parseFloat(monthlyRate) || 0;
            return rate * months;
        }
    }, [rentalType, dailyRate, monthlyRate, nights, months]);

    // Calculate deposit (30%) and remaining (70%)
    const depositAmount = useMemo(() => Math.round(totalBRL * 0.3 * 100) / 100, [totalBRL]);
    const remainingAmount = useMemo(() => Math.round(totalBRL * 0.7 * 100) / 100, [totalBRL]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!checkIn || !checkOut) {
            setError('Las fechas de check-in y check-out son requeridas');
            return;
        }
        if (new Date(checkOut) <= new Date(checkIn)) {
            setError('La fecha de check-out debe ser posterior al check-in');
            return;
        }
        if (rentalType === 'daily' && !dailyRate) {
            setError('El valor por noche es requerido');
            return;
        }
        if (rentalType === 'monthly' && !monthlyRate) {
            setError('El valor mensual es requerido');
            return;
        }

        const data: BookingFormData = {
            guestName: guestName.trim() || undefined,
            checkIn: Timestamp.fromDate(new Date(checkIn + 'T14:00:00')),
            checkOut: Timestamp.fromDate(new Date(checkOut + 'T10:00:00')),
            rentalType,
            dailyRate: rentalType === 'daily' ? parseFloat(dailyRate) : undefined,
            monthlyRate: rentalType === 'monthly' ? parseFloat(monthlyRate) : undefined,
            nights: rentalType === 'daily' ? nights : undefined,
            months: rentalType === 'monthly' ? months : undefined,
            totalBRL,
            depositAmount,
            depositPaid: status === 'confirmed' || status === 'completed',
            remainingAmount,
            platform,
            status,
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

            {/* Guest Name (Optional) */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del huésped (opcional)</label>
                <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Si lo conocés"
                />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Check-in *</label>
                    <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Check-out *</label>
                    <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {/* Rental Type */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo de alquiler *</label>
                <div className="grid grid-cols-2 gap-2">
                    {RENTAL_TYPES.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setRentalType(type.value as RentalType)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${rentalType === type.value
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rate based on type */}
            {rentalType === 'daily' ? (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">
                        Valor por noche (BRL) *
                        <span className="text-xs text-slate-500 ml-2">
                            {nights > 0 && `${nights} ${nights === 1 ? 'noche' : 'noches'}`}
                        </span>
                    </label>
                    <input
                        type="number"
                        value={dailyRate}
                        onChange={(e) => setDailyRate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
            ) : (
                <div>
                    <label className="block text-sm text-slate-400 mb-1">
                        Valor mensual (BRL) *
                        <span className="text-xs text-slate-500 ml-2">
                            {months > 0 && `${months} ${months === 1 ? 'mes' : 'meses'}`}
                        </span>
                    </label>
                    <input
                        type="number"
                        value={monthlyRate}
                        onChange={(e) => setMonthlyRate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
            )}

            {/* Calculated Total and Deposit */}
            {totalBRL > 0 && (
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4 space-y-3">
                    <div>
                        <p className="text-sm text-emerald-300 mb-1">Total</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            R$ {totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-3 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-amber-300">Seña (30%)</p>
                            <p className="text-lg font-semibold text-amber-400">
                                R$ {depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">Al confirmar</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Restante (70%)</p>
                            <p className="text-lg font-semibold text-white">
                                R$ {remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-500">En check-in</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Platform */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Plataforma</label>
                <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as BookingFormData['platform'])}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                    {PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {/* Status */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Estado</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookingFormData['status'])}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                    {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm text-slate-400 mb-1">Notas</label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 resize-none"
                    rows={3}
                    placeholder="Notas adicionales..."
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
