import { Timestamp } from 'firebase/firestore';

// Booking (Reservas)
export type RentalType = 'daily' | 'monthly';

export interface Booking {
    id: string;
    guestName?: string; // Optional - usually managed by admin
    checkIn: Timestamp;
    checkOut: Timestamp;
    rentalType: RentalType;
    dailyRate?: number;     // Rate per night (temporada)
    monthlyRate?: number;   // Rate per month
    nights?: number;        // Calculated: checkOut - checkIn
    months?: number;        // Calculated: months between dates
    totalBRL: number;       // Calculated total
    // Deposit (Seña) - 30% of total
    depositAmount: number;  // 30% of totalBRL
    depositPaid: boolean;   // True when confirmed
    remainingAmount: number; // 70% - paid at check-in
    platform: 'airbnb' | 'booking' | 'direct' | 'other';
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
    // confirmed = deposit paid, pending = waiting deposit, completed = fully paid
    notes?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export type BookingFormData = Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>;

// Income (Ingresos)
export interface Income {
    id: string;
    bookingId?: string;
    date: Timestamp;
    amountBRL: number;
    amountUSDT?: number;
    amountARS?: number;
    tcUsed?: number;
    category: 'rental' | 'deposit' | 'other';
    description: string;
    createdAt: Timestamp;
}

// Expense Categories
export type ExpenseCategory =
    | 'iptu'
    | 'ambiental'
    | 'condominio'
    | 'internet'
    | 'celesc'
    | 'reparacion'
    | 'limpieza'
    | 'comision'
    | 'other';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
    iptu: 'IPTU',
    ambiental: 'Ambiental',
    condominio: 'Condominio',
    internet: 'Internet',
    celesc: 'CELESC',
    reparacion: 'Reparación',
    limpieza: 'Limpieza',
    comision: 'Comisión',
    other: 'Otro',
};

// Expense (Gastos)
export interface Expense {
    id: string;
    date: Timestamp;
    amountBRL: number;
    category: ExpenseCategory;
    description: string;
    isPaid: boolean;
    dueDate?: Timestamp;
    isRecurring: boolean;
    recurringDay?: number;
    createdAt: Timestamp;
}

// Objective (Objetivos)
export interface Objective {
    id: string;
    title: string;
    targetAmount: number;
    currency: 'BRL' | 'USDT' | 'ARS';
    currentAmount: number;
    deadline?: Timestamp;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: Timestamp;
}
