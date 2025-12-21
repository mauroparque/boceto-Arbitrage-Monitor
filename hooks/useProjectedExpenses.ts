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
import { ProjectedExpense, ProjectedExpenseCategory } from '../types';

export type ProjectedExpenseFormData = Omit<ProjectedExpense, 'id' | 'createdAt'>;

export interface UseProjectedExpensesResult {
    projectedExpenses: ProjectedExpense[];
    isLoading: boolean;
    error: string | null;
    addProjectedExpense: (data: ProjectedExpenseFormData) => Promise<string>;
    updateProjectedExpense: (id: string, data: Partial<ProjectedExpenseFormData>) => Promise<void>;
    deleteProjectedExpense: (id: string) => Promise<void>;
    markAsPurchased: (id: string) => Promise<void>;
    getPendingExpenses: () => ProjectedExpense[];
    getTotalPendingUSDT: () => number;
    getByCategory: (category: ProjectedExpenseCategory) => ProjectedExpense[];
}

// Helper to remove undefined values
const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    );
};

export function useProjectedExpenses(): UseProjectedExpensesResult {
    const [projectedExpenses, setProjectedExpenses] = useState<ProjectedExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const expensesRef = collection(db, 'projectedExpenses');
        const q = query(expensesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const expensesList: ProjectedExpense[] = [];
                snapshot.forEach((doc) => {
                    expensesList.push({
                        id: doc.id,
                        ...doc.data(),
                    } as ProjectedExpense);
                });
                setProjectedExpenses(expensesList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching projected expenses:', err);
                setError('Error al cargar los gastos proyectados');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const addProjectedExpense = async (data: ProjectedExpenseFormData): Promise<string> => {
        try {
            const expensesRef = collection(db, 'projectedExpenses');
            const cleanData = removeUndefinedFields(data);
            const docRef = await addDoc(expensesRef, {
                ...cleanData,
                createdAt: Timestamp.now(),
            });
            return docRef.id;
        } catch (err) {
            console.error('Error adding projected expense:', err);
            throw new Error('Error al crear el gasto proyectado');
        }
    };

    const updateProjectedExpense = async (id: string, data: Partial<ProjectedExpenseFormData>): Promise<void> => {
        try {
            const expenseRef = doc(db, 'projectedExpenses', id);
            const cleanData = removeUndefinedFields(data);
            await updateDoc(expenseRef, cleanData);
        } catch (err) {
            console.error('Error updating projected expense:', err);
            throw new Error('Error al actualizar el gasto proyectado');
        }
    };

    const deleteProjectedExpense = async (id: string): Promise<void> => {
        try {
            const expenseRef = doc(db, 'projectedExpenses', id);
            await deleteDoc(expenseRef);
        } catch (err) {
            console.error('Error deleting projected expense:', err);
            throw new Error('Error al eliminar el gasto proyectado');
        }
    };

    const markAsPurchased = async (id: string): Promise<void> => {
        await updateProjectedExpense(id, { status: 'comprado' });
    };

    const getPendingExpenses = (): ProjectedExpense[] => {
        return projectedExpenses.filter((exp) => exp.status === 'pendiente');
    };

    const getTotalPendingUSDT = (): number => {
        return getPendingExpenses().reduce((sum, exp) => sum + exp.estimatedAmountUSDT, 0);
    };

    const getByCategory = (category: ProjectedExpenseCategory): ProjectedExpense[] => {
        return projectedExpenses.filter((exp) => exp.category === category);
    };

    return {
        projectedExpenses,
        isLoading,
        error,
        addProjectedExpense,
        updateProjectedExpense,
        deleteProjectedExpense,
        markAsPurchased,
        getPendingExpenses,
        getTotalPendingUSDT,
        getByCategory,
    };
}
