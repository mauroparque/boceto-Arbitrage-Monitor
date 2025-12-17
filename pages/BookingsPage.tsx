import React, { useState, useMemo } from 'react';
import { useBookings } from '../hooks/useBookings';
import { useRealTimeRates } from '../hooks/useRealTimeRates';
import { Booking } from '../types';
import { createDepositIncome, createRemainingIncome } from '../services/bookingIncomeService';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_LABELS: Record<Booking['status'], string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<Booking['status'], string> = {
    pending: 'bg-amber-900/50 text-amber-300',
    confirmed: 'bg-emerald-900/50 text-emerald-300',
    completed: 'bg-blue-900/50 text-blue-300',
    cancelled: 'bg-red-900/50 text-red-300',
};

export const BookingsPage: React.FC = () => {
    const { bookings, isLoading, updateBooking } = useBookings();
    const { rates } = useRealTimeRates();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isConfirming, setIsConfirming] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState<string | null>(null);

    // Filter bookings by status
    const filteredBookings = useMemo(() => {
        let filtered = bookings;
        if (statusFilter !== 'all') {
            filtered = bookings.filter((b) => b.status === statusFilter);
        }
        // Sort by check-in date (most recent first)
        return filtered.sort((a, b) => b.checkIn.toMillis() - a.checkIn.toMillis());
    }, [bookings, statusFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: bookings.length,
        pending: bookings.filter((b) => b.status === 'pending').length,
        confirmed: bookings.filter((b) => b.status === 'confirmed').length,
        completed: bookings.filter((b) => b.status === 'completed').length,
    }), [bookings]);

    const convertToARS = (brl: number) => rates ? brl * rates.brlArs : null;

    const formatDate = (date: Date) => {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    const handleConfirmBooking = async (booking: Booking) => {
        setIsConfirming(booking.id);
        try {
            // Create deposit income and update booking status
            await createDepositIncome(
                booking.id,
                booking.depositAmount,
                booking.checkIn,
                booking.guestName
            );
            await updateBooking(booking.id, { status: 'confirmed' });
        } catch (error) {
            console.error('Error confirming booking:', error);
        } finally {
            setIsConfirming(null);
        }
    };

    const handleCompleteBooking = async (booking: Booking) => {
        setIsCompleting(booking.id);
        try {
            // Create remaining income and update booking status
            await createRemainingIncome(
                booking.id,
                booking.remainingAmount,
                booking.checkIn,
                booking.guestName
            );
            await updateBooking(booking.id, { status: 'completed' });
        } catch (error) {
            console.error('Error completing booking:', error);
        } finally {
            setIsCompleting(null);
        }
    };

    const statusFilters: { id: StatusFilter; label: string; count?: number }[] = [
        { id: 'all', label: 'Todas', count: stats.total },
        { id: 'pending', label: 'Pendientes', count: stats.pending },
        { id: 'confirmed', label: 'Confirmadas', count: stats.confirmed },
        { id: 'completed', label: 'Completadas', count: stats.completed },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                Cargando reservas...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Reservas</h2>
                    <p className="text-slate-400 text-sm">Gestión de reservas</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">Total reservas</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
                    <p className="text-xs text-slate-500 mb-1">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/30">
                    <p className="text-xs text-slate-500 mb-1">Confirmadas</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
                    <p className="text-xs text-slate-500 mb-1">Completadas</p>
                    <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 bg-slate-800/50 p-1 rounded-lg w-fit">
                {statusFilters.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setStatusFilter(filter.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${statusFilter === filter.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {filter.label}
                        {filter.count !== undefined && filter.count > 0 && (
                            <span className="px-1.5 py-0.5 text-xs bg-slate-600 rounded-full">
                                {filter.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                {filteredBookings.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">No hay reservas</p>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {filteredBookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="p-4 hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="text-white font-medium">
                                                {booking.guestName || `${formatDate(booking.checkIn.toDate())} - ${formatDate(booking.checkOut.toDate())}`}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[booking.status]}`}>
                                                {STATUS_LABELS[booking.status]}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                            <span>📅 {formatDate(booking.checkIn.toDate())} → {formatDate(booking.checkOut.toDate())}</span>
                                            <span>•</span>
                                            <span>{booking.nights || booking.months} {booking.rentalType === 'daily' ? 'noches' : 'meses'}</span>
                                            <span>•</span>
                                            <span className="capitalize">{booking.platform}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Amounts */}
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-white">
                                                R$ {booking.totalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            {rates && (
                                                <p className="text-xs text-slate-500">
                                                    ≈ ${convertToARS(booking.totalBRL)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                                                </p>
                                            )}
                                            {booking.status === 'confirmed' && (
                                                <p className="text-xs text-amber-400 mt-1">
                                                    Restante: R$ {booking.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>

                                        {/* Confirm Button (only for pending bookings) */}
                                        {booking.status === 'pending' && (
                                            <button
                                                onClick={() => handleConfirmBooking(booking)}
                                                disabled={isConfirming === booking.id}
                                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                                            >
                                                {isConfirming === booking.id ? 'Procesando...' : '✓ Confirmar'}
                                            </button>
                                        )}

                                        {/* Complete Button (only for confirmed bookings) */}
                                        {booking.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleCompleteBooking(booking)}
                                                disabled={isCompleting === booking.id}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                                            >
                                                {isCompleting === booking.id ? 'Procesando...' : '✓ Completar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
