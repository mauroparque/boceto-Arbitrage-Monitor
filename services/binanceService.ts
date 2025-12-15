import { BinanceTicker, ExchangeRates } from '../types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3/ticker/price';

// We use a CORS proxy because calling api.binance.com directly from the browser 
// usually triggers CORS errors in a pure client-side app.
// In a production backend (Python/Node), you would call Binance directly.
const PROXY_BASE = 'https://api.allorigins.win/get?url=';

const fetchTicker = async (symbol: string): Promise<number> => {
  try {
    const targetUrl = `${BINANCE_API_BASE}?symbol=${symbol}`;
    const response = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // allorigins returns the actual content in a 'contents' string field
    const binanceData: BinanceTicker = JSON.parse(data.contents);
    
    return parseFloat(binanceData.price);
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    throw error;
  }
};

export const fetchAllRates = async (): Promise<ExchangeRates> => {
  // Fetch in parallel for performance
  const [usdtBrl, btcArs, btcUsdt] = await Promise.all([
    fetchTicker('USDTBRL'),
    fetchTicker('BTCARS'),
    fetchTicker('BTCUSDT')
  ]);

  return {
    usdtBrl,
    btcArs,
    btcUsdt
  };
};