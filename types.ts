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