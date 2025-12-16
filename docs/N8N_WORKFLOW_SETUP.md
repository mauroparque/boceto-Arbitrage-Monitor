# n8n Workflow Setup - TC Price History & Alerts

Este documento explica cómo configurar el workflow de n8n para:
1. Guardar precios cada 15 minutos en Firestore
2. Calcular promedios y enviar alertas por email

---

## Prerequisitos

1. **Firebase Service Account**
   - Ve a Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Descarga el JSON y guárdalo seguro

2. **n8n Firebase Credentials**
   - En n8n: Settings → Credentials → New Credential
   - Tipo: "Firebase Admin SDK"
   - Pega el contenido del JSON del Service Account

---

## Workflow Nodes

### 1. Schedule Trigger
- **Type**: Schedule Trigger
- **Interval**: Every 15 minutes

### 2. HTTP Request - Fetch Binance Prices
- **Method**: GET
- **URL**: `https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","BTCARS","USDTBRL","USDTARS"]`
- **Response Format**: JSON

### 3. Function - Calculate Rates
```javascript
const prices = $input.all()[0].json;

// Parse prices into object
const priceMap = {};
for (const item of prices) {
  priceMap[item.symbol] = parseFloat(item.price);
}

const btcUsdt = priceMap['BTCUSDT'] || 0;
const btcArs = priceMap['BTCARS'] || 0;
const usdtBrl = priceMap['USDTBRL'] || 0;
const usdtArs = priceMap['USDTARS'] || 0;

// Calculate derived rates
const usdtArsDerived = btcArs / btcUsdt;
const brlArs = usdtArsDerived / usdtBrl;

return [{
  json: {
    timestamp: new Date().toISOString(),
    btcUsdt,
    btcArs,
    usdtBrl,
    usdtArs,
    usdtArsDerived,
    brlArs
  }
}];
```

### 4. Firebase Admin - Write to Firestore
- **Operation**: Create Document
- **Project ID**: `tu-project-id`
- **Collection**: `priceHistory`
- **Document ID**: Auto-generate
- **Fields**: Map all fields from previous node + add server timestamp

### 5. Firebase Admin - Read Last 7 Days
- **Operation**: Get Multiple Documents
- **Collection**: `priceHistory`
- **Filter**: `timestamp` >= (now - 7 days)
- **Order By**: `timestamp` DESC
- **Limit**: 700 (approx 1 week at 15 min intervals)

### 6. Function - Calculate Average & Check Alert
```javascript
const currentData = $('Function').item.json;
const historicalDocs = $input.all();

// Calculate averages for each TC
let sumBrlArs = 0;
let sumUsdtArs = 0;
let sumUsdtBrl = 0;
let count = 0;

for (const doc of historicalDocs) {
  if (doc.json.brlArs) {
    sumBrlArs += doc.json.brlArs;
    sumUsdtArs += doc.json.usdtArsDerived || doc.json.usdtArs;
    sumUsdtBrl += doc.json.usdtBrl;
    count++;
  }
}

const avgBrlArs = count > 0 ? sumBrlArs / count : 0;
const avgUsdtArs = count > 0 ? sumUsdtArs / count : 0;
const avgUsdtBrl = count > 0 ? sumUsdtBrl / count : 0;

// Calculate % change from average
const THRESHOLD = 5; // 5%

const changeBrlArs = avgBrlArs > 0 ? ((currentData.brlArs - avgBrlArs) / avgBrlArs) * 100 : 0;
const changeUsdtArs = avgUsdtArs > 0 ? ((currentData.usdtArsDerived - avgUsdtArs) / avgUsdtArs) * 100 : 0;
const changeUsdtBrl = avgUsdtBrl > 0 ? ((currentData.usdtBrl - avgUsdtBrl) / avgUsdtBrl) * 100 : 0;

// Check if any TC exceeds threshold
const alerts = [];

if (Math.abs(changeBrlArs) >= THRESHOLD) {
  alerts.push({
    tc: 'BRL → ARS',
    current: currentData.brlArs.toFixed(4),
    average: avgBrlArs.toFixed(4),
    change: changeBrlArs.toFixed(2),
    direction: changeBrlArs > 0 ? 'subió' : 'bajó'
  });
}

if (Math.abs(changeUsdtArs) >= THRESHOLD) {
  alerts.push({
    tc: 'USDT → ARS',
    current: currentData.usdtArsDerived.toFixed(2),
    average: avgUsdtArs.toFixed(2),
    change: changeUsdtArs.toFixed(2),
    direction: changeUsdtArs > 0 ? 'subió' : 'bajó'
  });
}

if (Math.abs(changeUsdtBrl) >= THRESHOLD) {
  alerts.push({
    tc: 'USDT → BRL',
    current: currentData.usdtBrl.toFixed(2),
    average: avgUsdtBrl.toFixed(2),
    change: changeUsdtBrl.toFixed(2),
    direction: changeUsdtBrl > 0 ? 'subió' : 'bajó'
  });
}

return [{
  json: {
    hasAlerts: alerts.length > 0,
    alerts,
    currentData,
    averages: { avgBrlArs, avgUsdtArs, avgUsdtBrl }
  }
}];
```

### 7. IF - Check if Should Send Alert
- **Condition**: `{{ $json.hasAlerts }}` equals `true`

### 8. Send Email (only if alerts exist)
- **To**: `maurolapadula@gmail.com`
- **Subject**: `🚨 Alerta TC: Movimiento significativo detectado`
- **Body** (HTML):
```html
<h2>Alerta de Tipo de Cambio</h2>

<p>Se detectaron los siguientes movimientos significativos:</p>

<table style="border-collapse: collapse; width: 100%;">
  <tr style="background: #f0f0f0;">
    <th style="padding: 8px; border: 1px solid #ddd;">TC</th>
    <th style="padding: 8px; border: 1px solid #ddd;">Actual</th>
    <th style="padding: 8px; border: 1px solid #ddd;">Promedio Semanal</th>
    <th style="padding: 8px; border: 1px solid #ddd;">Cambio</th>
  </tr>
  {{#each alerts}}
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;">{{ tc }}</td>
    <td style="padding: 8px; border: 1px solid #ddd;">{{ current }}</td>
    <td style="padding: 8px; border: 1px solid #ddd;">{{ average }}</td>
    <td style="padding: 8px; border: 1px solid #ddd; color: {{ #if (gt change 0) }}green{{ else }}red{{ /if }};">
      {{ direction }} {{ change }}%
    </td>
  </tr>
  {{/each}}
</table>

<p style="margin-top: 20px; color: #666;">
  <small>Generado automáticamente por FX Arbitrage Monitor</small>
</p>
```

---

## Webhook para Frontend (Opcional)

Si querés que el frontend pueda leer el historial desde n8n en vez de Firestore directamente:

### Webhook - Get History
- **Path**: `/tc-history`
- **Method**: GET
- **Response**: Return last 7 days or 30 days based on query param

---

## Testing

1. Activa el workflow
2. Click "Execute Workflow" manualmente
3. Verifica que aparezcan documentos en Firestore
4. Revisa la consola de n8n para errores

---

## Notas de Seguridad

- ⚠️ No subas el Service Account JSON a GitHub
- ⚠️ Configura reglas de Firestore para permitir solo lectura pública y escritura desde Admin SDK
