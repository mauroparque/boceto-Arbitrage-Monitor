import React, { useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { CalendarMonthView } from '../components/Calendar/CalendarMonthView';
import { BookingForm } from '../components/forms/BookingForm';
import { Booking, BookingFormData } from '../types';
import { Timestamp } from 'firebase/firestore';
import {
    createDepositIncome,
    createRemainingIncome,
    deleteRemainingIncomeForBooking,
    deleteAllIncomesForBooking,
    hasLinkedIncomes,
} from '../services/bookingIncomeService';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const CalendarPage: React.FC = () => {
    const { bookings, isLoading, error, addBooking, updateBooking, deleteBooking, getBookingsForMonth } = useBookings();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthBookings = getBookingsForMonth(year, month);

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setSelectedBooking(null);
        setShowModal(true);
    };

    const handleBookingClick = (booking: Booking) => {
        setSelectedBooking(booking);
        setSelectedDate(null);
        setShowModal(true);
    };

    const handleSubmit = async (data: BookingFormData) => {
        setIsSubmitting(true);
        try {
            if (selectedBooking) {
                // Editing existing booking
                const oldStatus = selectedBooking.status;
                const newStatus = data.status;

                await updateBooking(selectedBooking.id, data);

                // Handle status transitions
                if (oldStatus === 'pending' && newStatus === 'confirmed') {
                    // Pending -> Confirmed: create only deposit
                    const alreadyHasIncomes = await hasLinkedIncomes(selectedBooking.id);
                    if (!alreadyHasIncomes) {
                        await createDepositIncome(
                            selectedBooking.id,
                            data.depositAmount,
                            data.checkIn,
                            data.guestName
                        );
                    }
                } else if (oldStatus === 'pending' && newStatus === 'completed') {
                    // Pending -> Completed: create both deposit and remaining
                    const alreadyHasIncomes = await hasLinkedIncomes(selectedBooking.id);
                    if (!alreadyHasIncomes) {
                        await createDepositIncome(
                            selectedBooking.id,
                            data.depositAmount,
                            data.checkIn,
                            data.guestName
                        );
                        await createRemainingIncome(
                            selectedBooking.id,
                            data.remainingAmount,
                            data.checkIn,
                            data.guestName
                        );
                    }
                } else if (oldStatus === 'confirmed' && newStatus === 'completed') {
                    // Confirmed -> Completed: create remaining income
                    await createRemainingIncome(
                        selectedBooking.id,
                        data.remainingAmount,
                        data.checkIn,
                        data.guestName
                    );
                } else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
                    // Transitioning to cancelled: delete only remaining income (deposit is kept)
                    await deleteRemainingIncomeForBooking(selectedBooking.id);
                }
            } else {
                // Creating new booking
                const bookingId = await addBooking(data);

                // Create incomes based on status
                if (data.status === 'confirmed') {
                    // Confirmed: only create deposit
                    await createDepositIncome(
                        bookingId,
                        data.depositAmount,
                        data.checkIn,
                        data.guestName
                    );
                } else if (data.status === 'completed') {
                    // Completed: create both deposit and remaining
                    await createDepositIncome(
                        bookingId,
                        data.depositAmount,
                        data.checkIn,
                        data.guestName
                    );
                    await createRemainingIncome(
                        bookingId,
                        data.remainingAmount,
                        data.checkIn,
                        data.guestName
                    );
                }
            }
            setShowModal(false);
            setSelectedBooking(null);
            setSelectedDate(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedBooking) return;
        setIsSubmitting(true);
        try {
            // Delete all linked incomes before deleting the booking
            await deleteAllIncomesForBooking(selectedBooking.id);
            await deleteBooking(selectedBooking.id);
            setShowModal(false);
            setSelectedBooking(null);
            setShowDeleteConfirm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitialFormData = (): Partial<BookingFormData> | undefined => {
        if (selectedBooking) {
            return {
                guestName: selectedBooking.guestName,
                checkIn: selectedBooking.checkIn,
                checkOut: selectedBooking.checkOut,
                totalBRL: selectedBooking.totalBRL,
                platform: selectedBooking.platform,
                status: selectedBooking.status,
                notes: selectedBooking.notes,
            };
        }
        if (selectedDate) {
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            return {
                checkIn: Timestamp.fromDate(selectedDate),
                checkOut: Timestamp.fromDate(nextDay),
            };
        }
        return undefined;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Calendario</h2>
                    <p className="text-stone-400 text-sm">Gestión de reservas</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedBooking(null);
                        setSelectedDate(null);
                        setShowModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    + Nueva reserva
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors text-stone-400 hover:text-white"
                >
                    ← Anterior
                </button>
                <h3 className="text-lg font-semibold text-white">
                    {MONTHS[month]} {year}
                </h3>
                <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors text-stone-400 hover:text-white"
                >
                    Siguiente →
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
                    {error}
                </div>
            )}

            {/* Loading state */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64 text-stone-400">
                    Cargando calendario...
                </div>
            ) : (
                <>
                    {/* Calendar */}
                    <CalendarMonthView
                        bookings={monthBookings}
                        currentDate={currentDate}
                        onDateClick={handleDateClick}
                        onBookingClick={handleBookingClick}
                    />

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-xs text-stone-400">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-600/50 rounded" />
                            <span>Check-in</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-600/50 rounded" />
                            <span>Check-out</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-stone-600/50 rounded" />
                            <span>Ocupado</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
                            <p className="text-xs text-stone-500 mb-1">Reservas del mes</p>
                            <p className="text-2xl font-bold text-white">{monthBookings.length}</p>
                        </div>
                        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50">
                            <p className="text-xs text-stone-500 mb-1">Total del mes</p>
                            <p className="text-2xl font-bold text-amber-400">
                                R$ {monthBookings.reduce((sum, b) => sum + (b.totalBRL || 0), 0).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-stone-800 rounded-2xl border border-stone-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-white">
                                    {selectedBooking ? 'Editar reserva' : 'Nueva reserva'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedBooking(null);
                                        setShowDeleteConfirm(false);
                                    }}
                                    className="text-stone-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {showDeleteConfirm ? (
                                <div className="space-y-4">
                                    <p className="text-stone-300">¿Estás seguro de eliminar esta reserva?</p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <BookingForm
                                        initialData={getInitialFormData()}
                                        onSubmit={handleSubmit}
                                        onCancel={() => {
                                            setShowModal(false);
                                            setSelectedBooking(null);
                                        }}
                                        isLoading={isSubmitting}
                                    />

                                    {selectedBooking && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full mt-4 px-4 py-2 text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Eliminar reserva
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
