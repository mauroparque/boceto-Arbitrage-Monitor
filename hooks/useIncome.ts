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
    Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Income } from '../types';

export type IncomeFormData = Omit<Income, 'id' | 'createdAt'>;

export interface UseIncomeResult {
    incomes: Income[];
    isLoading: boolean;
    error: string | null;
    addIncome: (data: IncomeFormData) => Promise<string>;
    updateIncome: (id: string, data: Partial<IncomeFormData>) => Promise<void>;
    deleteIncome: (id: string) => Promise<void>;
    getIncomeByMonth: (year: number, month: number) => Income[];
    getTotalByMonth: (year: number, month: number) => number;
    // New functions for booking integration
    getUnconfirmedIncomes: () => Income[];
    confirmIncome: (id: string) => Promise<void>;
    getIncomesByBookingId: (bookingId: string) => Income[];
    deleteIncomesByBookingId: (bookingId: string) => Promise<void>;
}

// Helper to remove undefined values
const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    );
};

export function useIncome(): UseIncomeResult {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const incomesRef = collection(db, 'income');
        const q = query(incomesRef, orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const incomesList: Income[] = [];
                snapshot.forEach((doc) => {
                    incomesList.push({
                        id: doc.id,
                        ...doc.data(),
                    } as Income);
                });
                setIncomes(incomesList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching incomes:', err);
                setError('Error al cargar los ingresos');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const addIncome = async (data: IncomeFormData): Promise<string> => {
        try {
            const incomesRef = collection(db, 'income');
            const cleanData = removeUndefinedFields(data);
            const docRef = await addDoc(incomesRef, {
                ...cleanData,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error('Error adding income:', err);
            throw new Error('Error al crear el ingreso');
        }
    };

    const updateIncome = async (id: string, data: Partial<IncomeFormData>): Promise<void> => {
        try {
            const incomeRef = doc(db, 'income', id);
            const cleanData = removeUndefinedFields(data);
            await updateDoc(incomeRef, cleanData);
        } catch (err) {
            console.error('Error updating income:', err);
            throw new Error('Error al actualizar el ingreso');
        }
    };

    const deleteIncome = async (id: string): Promise<void> => {
        try {
            const incomeRef = doc(db, 'income', id);
            await deleteDoc(incomeRef);
        } catch (err) {
            console.error('Error deleting income:', err);
            throw new Error('Error al eliminar el ingreso');
        }
    };

    const getIncomeByMonth = (year: number, month: number): Income[] => {
        return incomes.filter((income) => {
            const date = income.date.toDate();
            return date.getFullYear() === year && date.getMonth() === month;
        });
    };

    const getTotalByMonth = (year: number, month: number): number => {
        return getIncomeByMonth(year, month).reduce((sum, inc) => sum + inc.amountBRL, 0);
    };

    // Get all incomes that are pending confirmation (isConfirmed = false)
    const getUnconfirmedIncomes = (): Income[] => {
        return incomes.filter((income) => income.isConfirmed === false);
    };

    // Confirm an income (change isConfirmed to true)
    const confirmIncome = async (id: string): Promise<void> => {
        try {
            const incomeRef = doc(db, 'income', id);
            await updateDoc(incomeRef, { isConfirmed: true });
        } catch (err) {
            console.error('Error confirming income:', err);
            throw new Error('Error al confirmar el ingreso');
        }
    };

    // Get all incomes linked to a specific booking
    const getIncomesByBookingId = (bookingId: string): Income[] => {
        return incomes.filter((income) => income.bookingId === bookingId);
    };

    // Delete all incomes linked to a specific booking (used for cancellations)
    const deleteIncomesByBookingId = async (bookingId: string): Promise<void> => {
        const linkedIncomes = getIncomesByBookingId(bookingId);
        for (const income of linkedIncomes) {
            await deleteIncome(income.id);
        }
    };

    return {
        incomes,
        isLoading,
        error,
        addIncome,
        updateIncome,
        deleteIncome,
        getIncomeByMonth,
        getTotalByMonth,
        getUnconfirmedIncomes,
        confirmIncome,
        getIncomesByBookingId,
        deleteIncomesByBookingId,
    };
}
