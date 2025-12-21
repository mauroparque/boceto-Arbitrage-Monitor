import { Timestamp } from 'firebase/firestore';

// ============================================
// Original types for arbitrage monitor
// ============================================

export interface BinanceTicker {
  symbol: string;
  price: string;
}

export interface ExchangeRates {
  usdtBrl: number;
  btcArs: number;
  btcUsdt: number;
}

export interface CalculatedRates {
  usdtArs: number;    // Implied USDT/ARS (Crypto Dollar)
  brlUsdt: number;    // Value of 1 BRL in USDT
  brlArs: number;     // Final Implied BRL -> ARS
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  rates: ExchangeRates | null;
  calculations: CalculatedRates | null;
}

// ============================================
// Property Management types
// ============================================

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
export type SourceCurrency = 'BRL' | 'ARS' | 'USDT';

export interface Income {
  id: string;
  bookingId?: string;
  date: Timestamp;
  // Montos en diferentes monedas
  amountBRL: number;        // Monto original en BRL (si sourceCurrency = BRL)
  amountUSDT?: number;      // Monto en USDT (calculado o ingresado)
  amountARS?: number;       // Monto en ARS (si sourceCurrency = ARS)
  // Información de conversión
  sourceCurrency: SourceCurrency;  // Moneda de origen del pago
  tcAtOperation?: number;   // TC usado al momento del ingreso (ej: BRL→USDT)
  tcUsed?: number;          // Legacy: TC usado (mantener compatibilidad)
  // Metadata
  category: 'rental' | 'deposit' | 'other';
  description: string;
  isConfirmed: boolean;
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
  | 'mejoras'
  | 'other';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  iptu: 'IPTU',
  ambiental: 'Ambiental',
  condominio: 'Condominio',
  internet: 'Internet',
  celesc: 'CELESC',
  reparacion: 'Reparación',
  limpieza: 'Limpieza',
  mejoras: 'Mejoras',
  other: 'Otro',
};

// Expense (Gastos)
export type TargetCurrency = 'BRL' | 'ARS';

export interface Expense {
  id: string;
  date: Timestamp;
  // Montos
  amountBRL: number;          // Monto en BRL (si targetCurrency = BRL)
  amountUSDT?: number;        // Equivalente en USDT al momento del pago
  amountARS?: number;         // Monto en ARS (si targetCurrency = ARS)
  // Información de conversión
  targetCurrency: TargetCurrency;  // Moneda destino del gasto
  tcAtPayment?: number;       // TC usado al momento del pago
  // Metadata
  category: ExpenseCategory;
  description: string;
  isPaid: boolean;
  paidDate?: Timestamp;       // Fecha real de pago (cuando isPaid = true)
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

// ============================================
// Projected Expenses (Gastos Proyectados)
// ============================================

export type ProjectedExpenseCategory = 'arreglos' | 'mejoras' | 'servicios' | 'otros';

export const PROJECTED_EXPENSE_CATEGORIES: Record<ProjectedExpenseCategory, string> = {
  arreglos: 'Arreglos',
  mejoras: 'Mejoras',
  servicios: 'Servicios',
  otros: 'Otros',
};

export interface ProjectedExpense {
  id: string;
  title: string;
  estimatedAmountUSDT: number;  // Siempre en USDT
  category: ProjectedExpenseCategory;
  priority: 'alta' | 'media' | 'baja';
  targetDate?: Timestamp;
  status: 'pendiente' | 'comprado' | 'cancelado';
  notes?: string;
  createdAt: Timestamp;
}