import React from 'react';
import { Booking } from '../../types';

interface CalendarMonthViewProps {
    bookings: Booking[];
    currentDate: Date;
    onDateClick?: (date: Date) => void;
    onBookingClick?: (booking: Booking) => void;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Booking event with its type for the day
interface DayBookingEvent {
    booking: Booking;
    type: 'full' | 'checkin' | 'checkout' | 'middle';
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
    bookings,
    currentDate,
    onDateClick,
    onBookingClick,
}) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and total days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Create calendar grid
    const calendarDays: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    // Get ALL bookings for a specific day (supports multiple: checkout + checkin on same day)
    const getBookingsForDay = (day: number): DayBookingEvent[] => {
        const currentDay = new Date(year, month, day);
        currentDay.setHours(12, 0, 0, 0);

        const events: DayBookingEvent[] = [];

        for (const booking of bookings) {
            if (booking.status === 'cancelled') continue;

            const checkIn = booking.checkIn.toDate();
            const checkOut = booking.checkOut.toDate();

            const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
            const checkOutDay = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
            const thisDay = new Date(year, month, day);

            if (thisDay.getTime() === checkInDay.getTime() && thisDay.getTime() === checkOutDay.getTime()) {
                events.push({ booking, type: 'full' });
            } else if (thisDay.getTime() === checkInDay.getTime()) {
                events.push({ booking, type: 'checkin' });
            } else if (thisDay.getTime() === checkOutDay.getTime()) {
                events.push({ booking, type: 'checkout' });
            } else if (thisDay > checkInDay && thisDay < checkOutDay) {
                events.push({ booking, type: 'middle' });
            }
        }

        // Sort: checkouts first, then checkins
        events.sort((a, b) => {
            const order = { checkout: 0, checkin: 1, full: 2, middle: 3 };
            return order[a.type] - order[b.type];
        });

        return events;
    };

    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

    // Get status-based styling
    const getStatusStyle = (booking: Booking, type: string) => {
        const isConfirmed = booking.status === 'confirmed' || booking.status === 'completed';
        const isPending = booking.status === 'pending';

        if (type === 'checkout') {
            return isConfirmed
                ? 'bg-amber-600/60 text-amber-100 border-l-2 border-amber-400'
                : 'bg-amber-600/30 text-amber-200 border-l-2 border-dashed border-amber-500';
        }
        if (type === 'checkin') {
            return isConfirmed
                ? 'bg-emerald-600/60 text-emerald-100 border-l-2 border-emerald-400'
                : 'bg-emerald-600/30 text-emerald-200 border-l-2 border-dashed border-emerald-500';
        }
        if (type === 'full') {
            return isConfirmed
                ? 'bg-blue-600/60 text-blue-100 border-l-2 border-blue-400'
                : 'bg-blue-600/30 text-blue-200 border-l-2 border-dashed border-blue-500';
        }
        // middle - días intermedios con fondo sólido para continuidad visual
        return isConfirmed
            ? 'bg-purple-600/50 text-purple-100'
            : 'bg-purple-600/30 text-purple-200 border-dashed border-purple-500';
    };

    const getBookingLabel = (booking: Booking) => {
        return booking.guestName ||
            `${booking.checkIn.toDate().getDate()}/${booking.checkIn.toDate().getMonth() + 1}`;
    };

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-slate-900/50">
                {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-slate-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="p-2 min-h-[100px] bg-slate-900/30" />;
                    }

                    const dayBookings = getBookingsForDay(day);
                    const hasCheckout = dayBookings.some(e => e.type === 'checkout');
                    const hasCheckin = dayBookings.some(e => e.type === 'checkin');
                    const isSplitDay = hasCheckout && hasCheckin;

                    return (
                        <div
                            key={day}
                            className={`min-h-[100px] border-t border-l border-slate-700/30 cursor-pointer transition-colors hover:bg-slate-700/20 flex flex-col ${isToday(day) ? 'bg-emerald-900/20' : ''
                                }`}
                            onClick={() => {
                                if (dayBookings.length === 1 && onBookingClick) {
                                    onBookingClick(dayBookings[0].booking);
                                } else if (dayBookings.length === 0 && onDateClick) {
                                    onDateClick(new Date(year, month, day));
                                }
                            }}
                        >
                            {/* Day number */}
                            <div className={`text-sm font-medium p-1 ${isToday(day) ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                {day}
                            </div>

                            {/* Split day view: checkout on top, checkin on bottom */}
                            {isSplitDay ? (
                                <div className="flex-1 flex flex-col gap-0.5 px-1 pb-1">
                                    {/* Checkout - top half */}
                                    {dayBookings.filter(e => e.type === 'checkout').map((event) => (
                                        <div
                                            key={`out-${event.booking.id}`}
                                            className={`text-xs px-1.5 py-1 rounded-t flex-1 flex items-center gap-1 ${getStatusStyle(event.booking, 'checkout')}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBookingClick?.(event.booking);
                                            }}
                                        >
                                            <span className="opacity-70">←</span>
                                            <span className="truncate">{getBookingLabel(event.booking)}</span>
                                        </div>
                                    ))}
                                    {/* Checkin - bottom half */}
                                    {dayBookings.filter(e => e.type === 'checkin').map((event) => (
                                        <div
                                            key={`in-${event.booking.id}`}
                                            className={`text-xs px-1.5 py-1 rounded-b flex-1 flex items-center gap-1 ${getStatusStyle(event.booking, 'checkin')}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBookingClick?.(event.booking);
                                            }}
                                        >
                                            <span className="opacity-70">→</span>
                                            <span className="truncate">{getBookingLabel(event.booking)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Regular day view */
                                <div className="flex-1 flex flex-col gap-0.5 px-1 pb-1">
                                    {dayBookings.map((event) => (
                                        <div
                                            key={event.booking.id}
                                            className={`text-xs px-1.5 py-1.5 rounded flex items-center gap-1 flex-1 ${getStatusStyle(event.booking, event.type)}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onBookingClick?.(event.booking);
                                            }}
                                        >
                                            {event.type === 'checkout' && <span className="opacity-70">←</span>}
                                            {event.type === 'checkin' && <span className="opacity-70">→</span>}
                                            {event.type === 'middle' && <span className="opacity-50">•</span>}
                                            <span className="truncate">
                                                {getBookingLabel(event.booking)}
                                            </span>
                                            {event.booking.status === 'pending' && (
                                                <span className="ml-auto text-[10px] opacity-60">?</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
