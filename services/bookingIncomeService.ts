import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, Income } from '../types';

// Helper to remove undefined values (Firestore doesn't accept them)
const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    );
};

/**
 * Creates deposit income for a confirmed booking.
 * - Deposit (30%): Created as confirmed, dated today
 */
export const createDepositIncome = async (
    bookingId: string,
    depositAmount: number,
    checkIn: Timestamp,
    guestName?: string
): Promise<void> => {
    const incomesRef = collection(db, 'income');
    const bookingLabel = guestName || formatDateRange(checkIn);

    // Create deposit income (confirmed, dated today)
    const depositData = removeUndefinedFields({
        bookingId: bookingId,
        date: Timestamp.now(),
        amountBRL: depositAmount,
        category: 'deposit' as const,
        description: `Seña - ${bookingLabel}`,
        isConfirmed: true,
        createdAt: Timestamp.now(),
    });
    await addDoc(incomesRef, depositData);
};

/**
 * Creates remaining income for a completed booking (check-in confirmed).
 * - Remaining (70%): Created as confirmed, dated at check-in
 */
export const createRemainingIncome = async (
    bookingId: string,
    remainingAmount: number,
    checkIn: Timestamp,
    guestName?: string
): Promise<void> => {
    const incomesRef = collection(db, 'income');
    const bookingLabel = guestName || formatDateRange(checkIn);

    // Create remaining income (confirmed, dated at check-in)
    const remainingData = removeUndefinedFields({
        bookingId: bookingId,
        date: checkIn,
        amountBRL: remainingAmount,
        category: 'rental' as const,
        description: `Restante reserva - ${bookingLabel}`,
        isConfirmed: true,
        createdAt: Timestamp.now(),
    });
    await addDoc(incomesRef, remainingData);
};

/**
 * Deletes only the remaining (rental) income for a cancelled booking.
 * The deposit is kept because it's non-refundable.
 */
export const deleteRemainingIncomeForBooking = async (bookingId: string): Promise<void> => {
    const incomesRef = collection(db, 'income');
    const q = query(
        incomesRef,
        where('bookingId', '==', bookingId),
        where('category', '==', 'rental')
    );

    const snapshot = await getDocs(q);
    for (const docSnapshot of snapshot.docs) {
        await deleteDoc(docSnapshot.ref);
    }
};

/**
 * Deletes all incomes for a booking (when booking is deleted).
 */
export const deleteAllIncomesForBooking = async (bookingId: string): Promise<void> => {
    const incomesRef = collection(db, 'income');
    const q = query(incomesRef, where('bookingId', '==', bookingId));

    const snapshot = await getDocs(q);
    for (const docSnapshot of snapshot.docs) {
        await deleteDoc(docSnapshot.ref);
    }
};

/**
 * Helper to format date range for display
 */
const formatDateRange = (checkIn: Timestamp): string => {
    const date = checkIn.toDate();
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

/**
 * Checks if a booking already has linked incomes
 */
export const hasLinkedIncomes = async (bookingId: string): Promise<boolean> => {
    const incomesRef = collection(db, 'income');
    const q = query(incomesRef, where('bookingId', '==', bookingId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};
