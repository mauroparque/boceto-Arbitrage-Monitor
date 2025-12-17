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
import { Expense, ExpenseCategory } from '../types';

export type ExpenseFormData = Omit<Expense, 'id' | 'createdAt'>;

export interface UseExpensesResult {
    expenses: Expense[];
    isLoading: boolean;
    error: string | null;
    addExpense: (data: ExpenseFormData) => Promise<string>;
    updateExpense: (id: string, data: Partial<ExpenseFormData>) => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;
    getPendingExpenses: () => Expense[];
    getExpensesByMonth: (year: number, month: number) => Expense[];
}

// Helper to remove undefined values
const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    );
};

export function useExpenses(): UseExpensesResult {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const expensesRef = collection(db, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const expensesList: Expense[] = [];
                snapshot.forEach((doc) => {
                    expensesList.push({
                        id: doc.id,
                        ...doc.data(),
                    } as Expense);
                });
                setExpenses(expensesList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching expenses:', err);
                setError('Error al cargar los gastos');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const addExpense = async (data: ExpenseFormData): Promise<string> => {
        try {
            const expensesRef = collection(db, 'expenses');
            const cleanData = removeUndefinedFields(data);
            const docRef = await addDoc(expensesRef, {
                ...cleanData,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error('Error adding expense:', err);
            throw new Error('Error al crear el gasto');
        }
    };

    const updateExpense = async (id: string, data: Partial<ExpenseFormData>): Promise<void> => {
        try {
            const expenseRef = doc(db, 'expenses', id);
            const cleanData = removeUndefinedFields(data);
            await updateDoc(expenseRef, cleanData);
        } catch (err) {
            console.error('Error updating expense:', err);
            throw new Error('Error al actualizar el gasto');
        }
    };

    const deleteExpense = async (id: string): Promise<void> => {
        try {
            const expenseRef = doc(db, 'expenses', id);
            await deleteDoc(expenseRef);
        } catch (err) {
            console.error('Error deleting expense:', err);
            throw new Error('Error al eliminar el gasto');
        }
    };

    const getPendingExpenses = (): Expense[] => {
        return expenses.filter((expense) => !expense.isPaid);
    };

    const getExpensesByMonth = (year: number, month: number): Expense[] => {
        return expenses.filter((expense) => {
            const date = expense.date.toDate();
            return date.getFullYear() === year && date.getMonth() === month;
        });
    };

    return {
        expenses,
        isLoading,
        error,
        addExpense,
        updateExpense,
        deleteExpense,
        getPendingExpenses,
        getExpensesByMonth,
    };
}
