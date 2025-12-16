# Documentación Técnica - BRL-ARS Arbitrage Monitor

## 📚 Tabla de Contenidos
1. [Arquitectura de Componentes](#arquitectura-de-componentes)
2. [Hooks Personalizados](#hooks-personalizados)
3. [Servicios](#servicios)
4. [Tipos TypeScript](#tipos-typescript)
5. [Flujos de Datos](#flujos-de-datos)
6. [Integración Firebase](#integración-firebase)
7. [Integración Binance](#integración-binance)
8. [Optimizaciones de Performance](#optimizaciones-de-performance)

---

## 🏗️ Arquitectura de Componentes

### Componente Principal: App.tsx

**Responsabilidades:**
- Orquestación de toda la UI
- Gestión de estado local (inputs del usuario)
- Cálculos de arbitraje y conversiones
- Persistencia en localStorage

**Estado Gestionado:**
```typescript
const {
  rates,           // RealTimeRates | null
  changes,         // RateChange
  isConnected,     // boolean
  lastUpdated,     // Date | null
  error,           // string | null
  reconnect        // () => void
} = useRealTimeRates();

const [usdtBalance, setUsdtBalance] = useState<string>('');
const [brlAmount, setBrlAmount] = useState<string>('');
const [convertAmount, setConvertAmount] = useState<string>('');
const [convertFrom, setConvertFrom] = useState<Currency>('USDT');
const [convertTo, setConvertTo] = useState<Currency>('ARS');
```

**Características Principales:**

1. **Persistencia LocalStorage:**
```typescript
// Cargar al montar
const [usdtBalance, setUsdtBalance] = useState<string>(() => {
  return localStorage.getItem('fiwind_usdt_balance') || '';
});

// Guardar al cambiar
useEffect(() => {
  localStorage.setItem('fiwind_usdt_balance', usdtBalance);
}, [usdtBalance]);
```

2. **Cálculo de Arbitraje:**
```typescript
const arbitrageCalc = rates && parsedBrl > 0 ? {
  // Paso 1: BRL → USDT
  usdtFromBrl: parsedBrl / rates.usdtBrl,
  
  // Paso 2: USDT → ARS
  arsFromUsdt: (parsedBrl / rates.usdtBrl) * rates.usdtArs,
  
  // Comparación directa
  arsDirectFromBrl: parsedBrl * rates.brlArs,
} : null;
```

3. **Convertidor Universal:**
```typescript
const convertCurrency = (amount: number, from: Currency, to: Currency): number | null => {
  if (!rates || amount <= 0) return null;
  if (from === to) return amount;

  // Conversiones directas
  if (from === 'USDT' && to === 'ARS') return amount * rates.usdtArs;
  if (from === 'USDT' && to === 'BRL') return amount * rates.usdtBrl;
  if (from === 'ARS' && to === 'USDT') return amount / rates.usdtArs;
  if (from === 'BRL' && to === 'USDT') return amount / rates.usdtBrl;
  if (from === 'BRL' && to === 'ARS') return amount * rates.brlArs;
  if (from === 'ARS' && to === 'BRL') return amount / rates.brlArs;

  return null;
};
```

---

### Componente: StatCard.tsx

**Props:**
```typescript
interface StatCardProps {
  title: string;           // Título de la tarjeta
  value: string;           // Valor principal (formateado)
  subValue?: string;       // Subtítulo/fuente de datos
  icon?: React.ReactNode;  // Icono SVG
  change?: {               // Indicador de cambio
    text: string;          // e.g., "+0.543%"
    color: string;         // CSS class para color
  };
  description: string;     // Descripción de cálculo
  highlight?: boolean;     // Destaca la tarjeta (verde)
}
```

**Ejemplo de uso:**
```typescript
<StatCard
  title="BRL → ARS"
  value={formatCurrency(rates.brlArs, 'ARS')}
  subValue="TC Implícito"
  change={formatChange(changes.brlArs)}
  icon={<ArrowRightIcon />}
  description="(USDT/ARS) ÷ (USDT/BRL)"
  highlight={true}
/>
```

---

### Componente: PriceChart.tsx

**Características:**
- Usa lightweight-charts v5
- Datos de Firebase Firestore
- Selección de TC y rango temporal
- Cálculo de promedios

**Implementación:**
```typescript
const { chartData, isLoading, error, weeklyAverage, currentVsAverage } = 
  usePriceHistory(timeRange, selectedTC);

// Inicializar chart
useEffect(() => {
  const chart = createChart(chartContainerRef.current, {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: '#94a3b8',
    },
    // ... más configuración
  });

  const series = chart.addSeries(LineSeries, {
    color: selectedTCConfig.color,
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
  });

  chartRef.current = chart;
  seriesRef.current = series;

  return () => chart.remove();
}, []);

// Actualizar datos
useEffect(() => {
  if (seriesRef.current && chartData.length > 0) {
    const lineData = chartData.map(point => ({
      time: point.time as number,
      value: point.value,
    }));
    seriesRef.current.setData(lineData);
    chartRef.current?.timeScale().fitContent();
  }
}, [chartData]);
```

---

## 🪝 Hooks Personalizados

### Hook: useRealTimeRates

**Propósito:** Conecta al WebSocket de Binance y calcula TCs en tiempo real.

**Flujo:**
```
1. Fetch inicial REST API → pricesRef.current
2. Conectar WebSocket → suscribir a 4 símbolos
3. onMessage → actualizar pricesRef (sin re-render)
4. setInterval(500ms) → calcular TCs → setState (re-render)
5. Cleanup → unsubscribe + clearInterval
```

**Optimización clave:**
```typescript
// Uso de ref para evitar re-renders en cada tick
const pricesRef = useRef({
  btcUsdt: 0,
  btcArs: 0,
  usdtBrl: 0,
  usdtArsDirect: 0,
});

const handleTickerUpdate = useCallback((update: TickerUpdate) => {
  // Solo actualiza ref, NO state
  if (update.symbol === 'btcusdt') {
    pricesRef.current.btcUsdt = update.price;
  }
  // ...
}, []);

// Throttle: solo recalcular cada 500ms
updateIntervalRef.current = setInterval(updateRates, 500);
```

**Cálculos:**
```typescript
const calculateRates = useCallback(() => {
  const { btcUsdt, btcArs, usdtBrl, usdtArsDirect } = pricesRef.current;

  if (btcUsdt === 0 || btcArs === 0 || usdtBrl === 0) {
    return null;
  }

  // TC USDT/ARS Derived = BTC/ARS ÷ BTC/USDT
  const usdtArsDerived = btcArs / btcUsdt;

  // TC BRL/ARS = USDT/ARS ÷ USDT/BRL
  const brlArs = usdtArsDerived / usdtBrl;

  // Spread (si hay rate directo)
  const spread = usdtArsDirect > 0
    ? ((usdtArsDirect - usdtArsDerived) / usdtArsDerived) * 100
    : 0;

  return {
    btcUsdt,
    btcArs,
    usdtBrl,
    usdtArsDirect,
    usdtArs: usdtArsDerived,
    usdtArsDerived,
    brlArs,
    spread,
  };
}, []);
```

---

### Hook: usePriceHistory

**Propósito:** Consultar historial de precios de Firestore y calcular estadísticas.

**Query Firestore:**
```typescript
const startDate = getStartDate(); // Hace 7 días o 30 días
const priceHistoryRef = collection(db, 'priceHistory');

const q = query(
  priceHistoryRef,
  where('timestamp', '>=', Timestamp.fromDate(startDate)),
  orderBy('timestamp', 'asc'),
  limit(3000) // Max ~1 mes a 15 min
);

const unsubscribe = onSnapshot(q, (snapshot) => {
  const records: PriceRecord[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    records.push({
      timestamp: data.timestamp.toDate(),
      btcUsdt: data.btcUsdt || 0,
      // ...
    });
  });
  setHistory(records);
}, (err) => {
  setError('Error al cargar historial de precios');
});
```

**Cálculo de Promedios:**
```typescript
// Promedio semanal
const weeklyAverage = (() => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyRecords = history.filter(r => r.timestamp >= oneWeekAgo);
  if (weeklyRecords.length === 0) return null;

  const sum = weeklyRecords.reduce((acc, r) => acc + (r[selectedTC] || 0), 0);
  return sum / weeklyRecords.length;
})();

// % diferencia vs promedio
const currentVsAverage = (() => {
  if (!weeklyAverage || history.length === 0) return null;
  const latest = history[history.length - 1];
  const currentValue = latest[selectedTC] || 0;
  return ((currentValue - weeklyAverage) / weeklyAverage) * 100;
})();
```

---

## 🔧 Servicios

### Servicio: binanceWebSocket.ts

**Arquitectura:** Singleton pattern

```typescript
class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Set<TickerCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  
  connect(): Promise<void> {
    const streams = ['btcusdt', 'btcars', 'usdtbrl', 'usdtars']
      .map(s => `${s}@trade`)
      .join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Trade stream: { s: symbol, p: price, T: timestamp }
      if (data.s && data.p) {
        const update = {
          symbol: data.s.toLowerCase(),
          price: parseFloat(data.p),
          timestamp: data.T || Date.now(),
        };
        
        // Notificar suscriptores
        this.callbacks.get(update.symbol)?.forEach(cb => cb(update));
      }
    };
    
    this.ws.onclose = () => {
      this.attemptReconnect(); // Exponential backoff
    };
  }
  
  subscribe(symbol: string, callback: TickerCallback): () => void {
    this.callbacks.get(symbol.toLowerCase())?.add(callback);
    return () => this.callbacks.get(symbol.toLowerCase())?.delete(callback);
  }
}

export const binanceWS = new BinanceWebSocketService();
```

**Reconnection Logic:**
```typescript
private attemptReconnect() {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    console.error('Max reconnection attempts reached');
    return;
  }

  this.reconnectAttempts++;
  const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

  setTimeout(() => {
    this.connect().catch(console.error);
  }, delay);
}
```

---

### Servicio: binanceService.ts (Legacy/Fallback)

**Nota:** Este servicio usa CORS proxy y REST API. Actualmente **no se usa** en producción (reemplazado por WebSocket).

```typescript
const BINANCE_API_BASE = 'https://api.binance.com/api/v3/ticker/price';
const PROXY_BASE = 'https://api.allorigins.win/get?url=';

const fetchTicker = async (symbol: string): Promise<number> => {
  const targetUrl = `${BINANCE_API_BASE}?symbol=${symbol}`;
  const response = await fetch(`${PROXY_BASE}${encodeURIComponent(targetUrl)}`);
  
  const data = await response.json();
  const binanceData: BinanceTicker = JSON.parse(data.contents);
  
  return parseFloat(binanceData.price);
};

export const fetchAllRates = async (): Promise<ExchangeRates> => {
  const [usdtBrl, btcArs, btcUsdt] = await Promise.all([
    fetchTicker('USDTBRL'),
    fetchTicker('BTCARS'),
    fetchTicker('BTCUSDT')
  ]);

  return { usdtBrl, btcArs, btcUsdt };
};
```

---

## 📘 Tipos TypeScript

### types.ts

```typescript
// Respuesta de Binance
export interface BinanceTicker {
  symbol: string;
  price: string;
}

// Tipos de cambio en tiempo real
export interface RealTimeRates {
  btcUsdt: number;        // BTC/USDT directo
  btcArs: number;         // BTC/ARS directo
  usdtBrl: number;        // USDT/BRL directo
  usdtArsDirect: number;  // USDT/ARS directo

  usdtArs: number;        // USDT/ARS derivado (default)
  usdtArsDerived: number; // USDT/ARS derivado (explícito)
  brlArs: number;         // BRL/ARS implícito

  spread: number;         // % diferencia directo vs derivado
}

// Cambios porcentuales
export interface RateChange {
  usdtArs: number;
  usdtArsDirect: number;
  usdtBrl: number;
  brlArs: number;
}

// Registro histórico
export interface PriceRecord {
  timestamp: Date;
  btcUsdt: number;
  btcArs: number;
  usdtBrl: number;
  usdtArs: number;
  usdtArsDerived: number;
  brlArs: number;
}

// Punto de datos para gráfico
export interface ChartDataPoint {
  time: number;  // Unix timestamp en segundos
  value: number;
}
```

---

## 🔄 Flujos de Datos

### Flujo: Actualización de Precios en Tiempo Real

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Binance WebSocket envía trade update                     │
│    { s: "BTCUSDT", p: "98345.67", T: 1702723456789 }       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. binanceWebSocket.onmessage()                             │
│    - Parse JSON                                              │
│    - Normaliza símbolo a lowercase                          │
│    - Crea TickerUpdate                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Notifica callbacks suscritos                             │
│    callbacks.get('btcusdt').forEach(cb => cb(update))       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. useRealTimeRates.handleTickerUpdate()                    │
│    - Actualiza pricesRef.current.btcUsdt = update.price     │
│    - NO triggerea re-render                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. setInterval cada 500ms                                   │
│    - calculateRates() lee pricesRef.current                 │
│    - Calcula TCs derivados                                   │
│    - setRates() → triggerea re-render                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. App.tsx re-renderiza                                     │
│    - StatCards muestran nuevos valores                      │
│    - Convertidor recalcula                                   │
│    - Simulador actualiza                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### Flujo: Historial de Precios (n8n → Firestore → React)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. n8n Schedule Trigger (cada 15 min)                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. HTTP Request a Binance REST API                          │
│    GET /api/v3/ticker/price?symbols=[...]                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. n8n Function Node                                        │
│    - Parsea precios                                          │
│    - Calcula usdtArsDerived = btcArs / btcUsdt              │
│    - Calcula brlArs = usdtArsDerived / usdtBrl              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Firebase Admin Node                                      │
│    - Crea documento en colección "priceHistory"            │
│    - timestamp: serverTimestamp()                            │
│    - btcUsdt, btcArs, usdtBrl, usdtArs, brlArs              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Firestore onSnapshot (React app)                         │
│    - usePriceHistory hook detecta nuevo documento           │
│    - Agrega a array history                                  │
│    - Recalcula promedios                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. PriceChart.tsx actualiza                                 │
│    - chartData tiene nuevo punto                            │
│    - lightweight-charts renderiza                           │
│    - Muestra nuevo promedio semanal                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔥 Integración Firebase

### Configuración (lib/firebase.ts)

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Estructura de Datos Firestore

**Colección: `priceHistory`**

```javascript
{
  // Document ID: auto-generado por Firestore
  
  // Campos:
  timestamp: Timestamp,        // Firebase Timestamp
  btcUsdt: number,             // 98345.67
  btcArs: number,              // 245678900.50
  usdtBrl: number,             // 5.85
  usdtArs: number,             // Opcional (directo)
  usdtArsDerived: number,      // 2498.45
  brlArs: number               // 426.88
}
```

### Reglas de Seguridad (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite lectura pública
    match /priceHistory/{document=**} {
      allow read: if true;
      // Solo escritura desde Admin SDK (n8n)
      allow write: if false;
    }
  }
}
```

---

## 💱 Integración Binance

### WebSocket API

**Endpoint:** `wss://stream.binance.com:9443/ws`

**Streams usados:**
- `btcusdt@trade`: Trades de BTC/USDT
- `btcars@trade`: Trades de BTC/ARS
- `usdtbrl@trade`: Trades de USDT/BRL
- `usdtars@trade`: Trades de USDT/ARS

**URL Combinada:**
```
wss://stream.binance.com:9443/ws/btcusdt@trade/btcars@trade/usdtbrl@trade/usdtars@trade
```

**Formato de Mensaje:**
```json
{
  "e": "trade",              // Event type
  "E": 1702723456789,        // Event time
  "s": "BTCUSDT",            // Symbol
  "t": 12345,                // Trade ID
  "p": "98345.67",           // Price
  "q": "0.123",              // Quantity
  "b": 88765,                // Buyer order ID
  "a": 50982,                // Seller order ID
  "T": 1702723456788,        // Trade time
  "m": true,                 // Is buyer market maker?
  "M": true                  // Ignore
}
```

**Campos relevantes para la app:**
- `s`: Symbol (convertido a lowercase)
- `p`: Price (parseado a float)
- `T`: Trade time (usado como timestamp)

### REST API (Fallback)

**Endpoint:** `https://api.binance.com/api/v3/ticker/price`

**Query para múltiples símbolos:**
```
GET /api/v3/ticker/price?symbols=["BTCUSDT","BTCARS","USDTBRL","USDTARS"]
```

**Respuesta:**
```json
[
  { "symbol": "BTCUSDT", "price": "98345.67" },
  { "symbol": "BTCARS", "price": "245678900.50" },
  { "symbol": "USDTBRL", "price": "5.85" },
  { "symbol": "USDTARS", "price": "2500.00" }
]
```

---

## ⚡ Optimizaciones de Performance

### 1. Throttling de Updates (500ms)

**Problema:** WebSocket envía ~10-50 updates/segundo → re-renders excesivos

**Solución:**
```typescript
// Almacenar en ref (no triggerea re-render)
const pricesRef = useRef({ btcUsdt: 0, btcArs: 0, ... });

// Actualizar solo cada 500ms
const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
updateIntervalRef.current = setInterval(updateRates, 500);
```

**Resultado:** 2 updates/segundo máximo → 90-95% menos re-renders

---

### 2. Memoización de Cálculos

```typescript
const calculateRates = useCallback(() => {
  // Cálculos pesados aquí
  return { /* ... */ };
}, []); // Sin dependencias → función estable

const updateRates = useCallback(() => {
  const newRates = calculateRates();
  if (newRates) {
    setRates(prev => {
      if (prev) setPreviousRates(prev);
      return newRates;
    });
  }
}, [calculateRates]);
```

---

### 3. Lightweight-charts Optimizations

```typescript
// Resize handler debounced implícitamente por browser
const handleResize = () => {
  if (chartContainerRef.current && chartRef.current) {
    chartRef.current.applyOptions({
      width: chartContainerRef.current.clientWidth
    });
  }
};
window.addEventListener('resize', handleResize);

// Actualizar datos solo cuando cambian
useEffect(() => {
  if (seriesRef.current && chartData.length > 0) {
    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }
}, [chartData]);
```

---

### 4. LocalStorage Persistence

```typescript
// Lectura lazy (solo al montar)
const [usdtBalance, setUsdtBalance] = useState<string>(() => {
  return localStorage.getItem('fiwind_usdt_balance') || '';
});

// Escritura solo cuando cambia (automático con useEffect)
useEffect(() => {
  localStorage.setItem('fiwind_usdt_balance', usdtBalance);
}, [usdtBalance]);
```

---

### 5. Firestore Query Optimization

```typescript
// Limitar resultados
const q = query(
  priceHistoryRef,
  where('timestamp', '>=', Timestamp.fromDate(startDate)),
  orderBy('timestamp', 'asc'),
  limit(3000) // Evita cargar todo el historial
);

// onSnapshot (tiempo real sin polling)
const unsubscribe = onSnapshot(q, (snapshot) => {
  // Solo procesa cuando hay cambios reales
  const records = snapshot.docs.map(doc => ({
    timestamp: doc.data().timestamp.toDate(),
    // ...
  }));
  setHistory(records);
});
```

---

## 🎯 Best Practices Implementadas

### TypeScript
- ✅ Tipado estricto en toda la app
- ✅ Interfaces bien definidas
- ✅ No uso de `any`
- ✅ Types exportados para reutilización

### React
- ✅ Hooks personalizados para lógica reutilizable
- ✅ useCallback para funciones estables
- ✅ useRef para valores que no triggeren re-render
- ✅ Cleanup en todos los useEffect

### Performance
- ✅ Throttling de updates de alta frecuencia
- ✅ Memoización de cálculos costosos
- ✅ Lazy loading de datos históricos
- ✅ Optimización de re-renders

### UX
- ✅ Loading states
- ✅ Error handling
- ✅ Reconnection automática
- ✅ Persistencia de inputs del usuario
- ✅ Indicadores visuales de estado

---

## 🔒 Consideraciones de Seguridad

### Firebase
1. ✅ API keys en variables de entorno (no commiteadas)
2. ✅ Firestore rules: solo lectura pública, escritura desde Admin SDK
3. ✅ No autenticación requerida (app pública de solo lectura)

### Binance
1. ✅ WebSocket público (no requiere API key)
2. ✅ No manejo de órdenes ni trading
3. ✅ Solo lectura de precios

### Frontend
1. ⚠️ CORS bypass con AllOrigins (solo en servicio legacy, no usado en prod)
2. ✅ No almacenamiento de datos sensibles
3. ✅ LocalStorage solo para preferencias UI (no crítico)

---

## 📊 Métricas y Monitoreo

### Métricas Sugeridas (no implementadas aún)

**Performance:**
- Time to First Render
- WebSocket connection time
- Chart render time
- Re-render frequency

**Funcional:**
- WebSocket uptime %
- Reconnection count
- Error rate
- Data freshness (tiempo desde última actualización)

**Negocio:**
- Spread promedio (directo vs derivado)
- Volatilidad de BRL/ARS
- Usuarios activos (si se implementa analytics)

---

**Última Actualización:** 2025-12-16  
**Versión:** 1.0.0
