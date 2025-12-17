import React, { useState } from 'react';
import { Booking } from '../../types';

interface CalendarMonthViewProps {
    bookings: Booking[];
    currentDate: Date;
    onDateClick?: (date: Date) => void;
    onBookingClick?: (booking: Booking) => void;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

    // Get booking status for a specific day
    const getBookingForDay = (day: number): { booking: Booking; type: 'full' | 'checkin' | 'checkout' | 'middle' } | null => {
        const date = new Date(year, month, day);
        date.setHours(12, 0, 0, 0); // Normalize to noon

        for (const booking of bookings) {
            if (booking.status === 'cancelled') continue;

            const checkIn = booking.checkIn.toDate();
            const checkOut = booking.checkOut.toDate();

            checkIn.setHours(0, 0, 0, 0);
            checkOut.setHours(23, 59, 59, 999);

            const checkInDay = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
            const checkOutDay = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
            const currentDay = new Date(year, month, day);

            if (currentDay.getTime() === checkInDay.getTime() && currentDay.getTime() === checkOutDay.getTime()) {
                return { booking, type: 'full' };
            } else if (currentDay.getTime() === checkInDay.getTime()) {
                return { booking, type: 'checkin' };
            } else if (currentDay.getTime() === checkOutDay.getTime()) {
                return { booking, type: 'checkout' };
            } else if (currentDay > checkInDay && currentDay < checkOutDay) {
                return { booking, type: 'middle' };
            }
        }

        return null;
    };

    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

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
                        return <div key={`empty-${index}`} className="p-2 min-h-[80px] bg-slate-900/30" />;
                    }

                    const bookingInfo = getBookingForDay(day);
                    const hasBooking = bookingInfo !== null;

                    return (
                        <div
                            key={day}
                            className={`p-2 min-h-[80px] border-t border-l border-slate-700/30 cursor-pointer transition-colors hover:bg-slate-700/30 ${isToday(day) ? 'bg-emerald-900/20' : ''
                                }`}
                            onClick={() => {
                                if (bookingInfo && onBookingClick) {
                                    onBookingClick(bookingInfo.booking);
                                } else if (onDateClick) {
                                    onDateClick(new Date(year, month, day));
                                }
                            }}
                        >
                            {/* Day number */}
                            <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                {day}
                            </div>

                            {/* Booking indicator */}
                            {hasBooking && (
                                <div
                                    className={`text-xs p-1 rounded truncate ${bookingInfo.type === 'checkin'
                                        ? 'bg-emerald-600/50 text-emerald-200 rounded-l-lg'
                                        : bookingInfo.type === 'checkout'
                                            ? 'bg-amber-600/50 text-amber-200 rounded-r-lg'
                                            : bookingInfo.type === 'full'
                                                ? 'bg-blue-600/50 text-blue-200'
                                                : 'bg-slate-600/50 text-slate-300'
                                        }`}
                                >
                                    {bookingInfo.type === 'checkin' && '→ '}
                                    {bookingInfo.type === 'checkout' && '← '}
                                    {bookingInfo.booking.guestName ||
                                        `${bookingInfo.booking.checkIn.toDate().getDate()}/${bookingInfo.booking.checkIn.toDate().getMonth() + 1} - ${bookingInfo.booking.checkOut.toDate().getDate()}/${bookingInfo.booking.checkOut.toDate().getMonth() + 1}`
                                    }
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
