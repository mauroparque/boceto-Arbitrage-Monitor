import { useState, useEffect } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, BookingFormData } from '../types';

export interface UseBookingsResult {
    bookings: Booking[];
    isLoading: boolean;
    error: string | null;
    addBooking: (data: BookingFormData) => Promise<string>;
    updateBooking: (id: string, data: Partial<BookingFormData>) => Promise<void>;
    deleteBooking: (id: string) => Promise<void>;
    getBookingsForMonth: (year: number, month: number) => Booking[];
}

export function useBookings(): UseBookingsResult {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, orderBy('checkIn', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const bookingsList: Booking[] = [];
                snapshot.forEach((doc) => {
                    bookingsList.push({
                        id: doc.id,
                        ...doc.data(),
                    } as Booking);
                });
                setBookings(bookingsList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching bookings:', err);
                setError('Error al cargar las reservas');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Helper to remove undefined values (Firestore doesn't accept them)
    const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, value]) => value !== undefined)
        );
    };

    const addBooking = async (data: BookingFormData): Promise<string> => {
        try {
            const bookingsRef = collection(db, 'bookings');
            const cleanData = removeUndefinedFields(data);
            const docRef = await addDoc(bookingsRef, {
                ...cleanData,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error('Error adding booking:', err);
            throw new Error('Error al crear la reserva');
        }
    };

    const updateBooking = async (id: string, data: Partial<BookingFormData>): Promise<void> => {
        try {
            const bookingRef = doc(db, 'bookings', id);
            const cleanData = removeUndefinedFields(data);
            await updateDoc(bookingRef, {
                ...cleanData,
                updatedAt: Timestamp.now(),
            });
        } catch (err) {
            console.error('Error updating booking:', err);
            throw new Error('Error al actualizar la reserva');
        }
    };

    const deleteBooking = async (id: string): Promise<void> => {
        try {
            const bookingRef = doc(db, 'bookings', id);
            await deleteDoc(bookingRef);
        } catch (err) {
            console.error('Error deleting booking:', err);
            throw new Error('Error al eliminar la reserva');
        }
    };

    const getBookingsForMonth = (year: number, month: number): Booking[] => {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        return bookings.filter((booking) => {
            const checkIn = booking.checkIn.toDate();
            const checkOut = booking.checkOut.toDate();

            // Booking overlaps with month if:
            // checkIn <= endOfMonth AND checkOut >= startOfMonth
            return checkIn <= endOfMonth && checkOut >= startOfMonth;
        });
    };

    return {
        bookings,
        isLoading,
        error,
        addBooking,
        updateBooking,
        deleteBooking,
        getBookingsForMonth,
    };
}
