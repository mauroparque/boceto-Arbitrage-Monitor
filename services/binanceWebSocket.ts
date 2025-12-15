// Binance WebSocket Service for Real-Time Price Updates
// Uses Binance's public WebSocket API - no CORS issues, no API key required

export interface TickerUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export type TickerCallback = (ticker: TickerUpdate) => void;

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

// Symbols we need to track
const SYMBOLS = ['btcusdt', 'btcars', 'usdtbrl'];

class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Set<TickerCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionStatusCallback: ((connected: boolean) => void) | null = null;

  constructor() {
    // Initialize callback sets for each symbol
    SYMBOLS.forEach(symbol => {
      this.callbacks.set(symbol, new Set());
    });
  }

  setConnectionStatusCallback(callback: (connected: boolean) => void) {
    this.connectionStatusCallback = callback;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      // Create combined stream URL for all symbols
      const streams = SYMBOLS.map(s => `${s}@trade`).join('/');
      const wsUrl = `${BINANCE_WS_BASE}/${streams}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ Binance WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionStatusCallback?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Trade stream format: { s: symbol, p: price, T: timestamp, ... }
            if (data.s && data.p) {
              const symbol = data.s.toLowerCase();
              const update: TickerUpdate = {
                symbol: symbol,
                price: parseFloat(data.p),
                timestamp: data.T || Date.now(),
              };

              // Notify all subscribers for this symbol
              const symbolCallbacks = this.callbacks.get(symbol);
              if (symbolCallbacks) {
                symbolCallbacks.forEach(cb => cb(update));
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.connectionStatusCallback?.(false);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnecting = false;
          this.connectionStatusCallback?.(false);
          this.attemptReconnect();
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  subscribe(symbol: string, callback: TickerCallback): () => void {
    const normalizedSymbol = symbol.toLowerCase();
    const symbolCallbacks = this.callbacks.get(normalizedSymbol);
    
    if (symbolCallbacks) {
      symbolCallbacks.add(callback);
    }

    // Return unsubscribe function
    return () => {
      symbolCallbacks?.delete(callback);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const binanceWS = new BinanceWebSocketService();
