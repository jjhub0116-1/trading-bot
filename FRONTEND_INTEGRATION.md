# Frontend Integration Guide
## Prop-Firm Trading Bot Backend

**Base URL (Production):** `https://trading-bot-e6e6.onrender.com`  
**Base URL (Local Dev):** `http://localhost:3000`  
**Content-Type:** All requests and responses are `application/json`

---

## 1. How Authentication Works

The backend uses **JWT (JSON Web Tokens)**. Every protected route requires you to send a Bearer token in the HTTP header.

### The Flow
```
1. User logs in → POST /api/auth/login
2. Backend returns a { token: "eyJ..." }
3. Store the token in localStorage or your state manager
4. Attach it to EVERY other request as a header:
   Authorization: Bearer <token>
5. Token expires after 24 hours — redirect user to login
```

### Setting Up Axios (React example)
```js
import axios from 'axios';

const api = axios.create({ baseURL: 'https://trading-bot-e6e6.onrender.com' });

// Attach token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### Handling Auth Errors Globally
```js
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login'; // redirect to login
    }
    return Promise.reject(err);
  }
);
```

---

## 2. Authentication Routes

### POST `/api/auth/register`
**Auth required:** ❌ No  
**Purpose:** Create a new user account. It automatically logs the user in and returns a JWT token.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Registration Successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 105,
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

**Frontend Usage:**
```js
async function register(name, email, password) {
  const res = await axios.post('/api/auth/register', { name, email, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
}
```

---

### POST `/api/auth/login`
**Auth required:** ❌ No  
**Purpose:** Log in a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "arjun@test.com",
  "password": "pass123"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Login Successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 10,
    "name": "Arjun",
    "email": "arjun@test.com"
  }
}
```

**Error Response `401`:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Frontend Usage:**
```js
async function login(email, password) {
  const res = await axios.post('/api/auth/login', { email, password });
  localStorage.setItem('token', res.data.token);
  localStorage.setItem('user', JSON.stringify(res.data.user));
}
```

---

## 3. Stocks Routes

### GET `/api/stocks`
**Auth required:** ❌ No  
**Purpose:** Fetch the live price list of all stocks available to trade.

**Success Response `200`:**
```json
[
  { 
    "stock_id": 101, 
    "symbol": "AAPL",  
    "stock_name": "Apple Inc",   
    "current_price": 150.00,
    "previousClose": 148.50,
    "open": 149.20,
    "asset_type": "STOCK"
  }
]
```

**Field Reference:**

| Field | Type | Description |
|---|---|---|
| `stock_id` | Number | Unique identifier |
| `symbol` | String | Ticker symbol (e.g. AAPL, GC=F) |
| `stock_name` | String | Full company or commodity name |
| `current_price` | Number | Live real-time market price |
| `asset_type` | String | `"STOCK"` or `"COMMODITY"` — use this to categorize assets in the UI |
| `fiftyTwoWeekHigh`| Number | The highest price this stock reached in the last 12 months |
| `fiftyTwoWeekLow` | Number | The lowest price this stock reached in the last 12 months |
| `dayHigh` | Number | Today's highest price |
| `dayLow` | Number | Today's lowest price |
| `previousClose` | Number | Yesterday's closing price |
| `open` | Number | Today's market open price |


**Frontend Usage:**
```js
// Poll every few seconds to keep prices live
const stocks = await api.get('/api/stocks');
// Use stocks.data to populate your stock price ticker/table
```

> 💡 **Tip:** Poll this endpoint every 3–5 seconds to show live prices. The backend engine updates these prices from the market stream.

---

## 4. Orders Routes

### POST `/api/orders` — Place an Order
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Place a BUY or SELL order on any stock. 

> **Important:** Do NOT send `userId` in the body. The backend extracts the user identity from the JWT token automatically.

**Request Body:**
```json
{
  "stockId": 101,
  "quantity": 50,
  "orderType": "MARKET",
  "price": 0,
  "stopLoss": 120,
  "target": 200,
  "side": "BUY"
}
```

**Field Reference:**

| Field | Type | Required | Description |
|---|---|---|---|
| `stockId` | Number | ✅ | The `stock_id` from `/api/stocks` |
| `quantity` | Number | ✅ | For Stocks: **Shares**. For Commodities: **Lots**. |
| `orderType` | String | ✅ | `"MARKET"` or `"LIMIT"` |
| `price` | Number | ✅ | Send `0` for MARKET orders. For LIMIT orders, send the limit price |
| `stopLoss` | Number | ❌ | Optional. If price drops to this, auto-sell triggers |
| `target` | Number | ❌ | Optional. If price rises to this, auto-sell triggers |
| `side` | String | ✅ | `"BUY"` or `"SELL"` |

> ⚠️ **IMPORTANT TERMINOLOGY:**
> - When buying a **STOCK** (e.g., AAPL): `quantity: 10` means 10 shares.
> - When buying a **COMMODITY** (e.g., Gold): `quantity: 10` means **10 LOTS** (which might be 2000 units).

**Order Type Guide:**

| Scenario | `side` | `orderType` | `price` | `stopLoss` | `target` |
|---|---|---|---|---|---|
| Buy now at market price | `BUY` | `MARKET` | `0` | — | — |
| Buy now with bracket (SL + target) | `BUY` | `MARKET` | `0` | `120` | `200` |
| Buy only if price drops to $140 | `BUY` | `LIMIT` | `140` | — | — |
| Sell now at market price | `SELL` | `MARKET` | `0` | — | — |
| **Short sell** — Sell without owning shares | `SELL` | `MARKET` | `0` | — | — |
| **Short sell** with bracket (cover if price hits SL/target) | `SELL` | `MARKET` | `0` | `220` | `80` |
| Sell (limit) only if price rises to $200 | `SELL` | `LIMIT` | `200` | — | — |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Order successfully placed!",
  "orderId": "ORD_1774772304396"
}
```

**Error Responses:**

| Status | Message | Meaning |
|---|---|---|
| `400` | `"Insufficient Equity Limits (Share Count Exceeded)"` | Total absolute share exposure (long + short combined) exceeds the user's equity cap |
| `400` | `"Stock Not Found"` | The `stockId` doesn't exist in the database |
| `400` | `"Account Blocked: Loss limit reached"` | Account is flagged — no new orders allowed |
| `401` | `"Unauthorized"` | Missing or no Authorization header |
| `403` | `"Critical Identity Fault"` | Token expired or invalid |

**Frontend Usage:**
```js
async function placeBuyOrder(stockId, quantity, stopLoss = null, target = null) {
  const res = await api.post('/api/orders', {
    stockId, quantity, orderType: 'MARKET', price: 0, stopLoss, target, side: 'BUY'
  });
  return res.data; // { success, message, orderId }
}

// Short sell (sell without owning shares)
async function placeShortSell(stockId, quantity, stopLoss = null, target = null) {
  const res = await api.post('/api/orders', {
    stockId, quantity, orderType: 'MARKET', price: 0,
    stopLoss,  // Price that triggers BUY to cut losses (cover short)
    target,    // Price that triggers BUY to take profit (cover short)
    side: 'SELL'
  });
  return res.data;
}

// Cover a short (buy back shares you shorted)
async function coverShort(stockId, quantity) {
  const res = await api.post('/api/orders', {
    stockId, quantity, orderType: 'MARKET', price: 0, side: 'BUY'
  });
  return res.data;
}
```

---

## 4b. Short Selling — Detailed Guide

### What is Short Selling?
A user can **sell shares they don't own**, betting the price will fall. The backend handles everything natively.

### How It Works
1. User places a MARKET **SELL** → executes immediately regardless of whether they own the stock
2. Their `net_quantity` in the portfolio becomes **negative** (e.g., `-50` = short 50 shares)
3. When they **BUY back** those shares later, the short is closed and P&L is realized
4. If they never close, the engine watches stop-loss and target every 3 seconds

### Important: Brackets Are Inverted for Shorts

| Event | Long BUY bracket | Short SELL bracket |
|---|---|---|
| `target` fires when... | Price **rises** to target | Price **drops** to target |
| `stop_loss` fires when... | Price **drops** to stop | Price **rises** to stop |

```js
// Long BUY: target=200 means sell when price RISES to $200
// Short SELL: target=80 means cover (buy back) when price DROPS to $80
```

### Portfolio Response for Short Positions
When a user holds a short, `GET /api/portfolio` returns:
```json
{
  "positions": [
    {
      "stock_id": 101,
      "net_quantity": -50,
      "average_price": 200.00,
      "position_type": "SHORT",
      "unrealized_pnl": 500.00,
      "realized_pnl": 0,
      "current_price": 190.00
    }
  ]
}
```

### P&L Calculation
The same formula works for both:
```
unrealized_pnl = (current_price - average_price) * net_quantity

Long example:  qty=+50, avg=$180, current=$200 → (200-180)*50 = +$1000 profit
Short example: qty=-50, avg=$200, current=$190 → (190-200)*-50 = +$500 profit
Short loss:    qty=-50, avg=$200, current=$220 → (220-200)*-50 = -$1000 loss
```

### Equity Limit for Short Selling
The equity cap applies to **total absolute exposure** (long + short combined):
```
User equity = 5000 shares
User holds: +1000 AAPL (long) + -500 TSLA (short) = 1500 shares used
Can short another: 3500 shares max
```

### Margin Call on Short Positions
If total effective risk P&L breaches `loss_limit`, the risk engine:
- **Long positions** → Force-closes via MARKET **SELL**
- **Short positions** → Force-closes via MARKET **BUY** (covers the short)


---

### GET `/api/orders` — Get Order History
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Fetch all orders (open, executed, cancelled) for the logged-in user.

**Success Response `200`:**
```json
[
  {
    "_id": "64abc123def456",
    "order_id": "ORD_1774772304396",
    "user_id": 10,
    "user_name": "Arjun",
    "stock_id": 101,
    "side": "BUY",
    "order_type": "MARKET",
    "quantity": 200,
    "price": 150,
    "stop_loss": 130,
    "target": 200,
    "status": "EXECUTED",
    "execution_price": 148.50,
    "executedAt": "2026-03-29T08:19:35.000Z",
    "createdAt": "2026-03-29T08:19:31.972Z"
  }
]
```

**Order `status` values:**

| Status | Meaning |
|---|---|
| `OPEN` | Pending — waiting for price condition (LIMIT/bracket) or engine tick |
| `EXECUTED` | Successfully filled — check `execution_price` for the actual fill price |
| `CANCELLED` | Manually cancelled by the user |
| `CANCELLED_BY_MARGIN_CALL` | Auto-cancelled when margin call liquidated the account |

**Key fields on executed orders:**

| Field | Description |
|---|---|
| `execution_price` | Actual price the order was filled at (may differ from `price` for limit orders) |
| `executedAt` | Exact timestamp when the order was executed |

**Frontend Usage:**
```js
const orders = await api.get('/api/orders');
// orders.data is sorted newest first
// Use _id to pass into cancel/modify endpoints
const openOrders = orders.data.filter(o => o.status === 'OPEN');
```

---

### PUT `/api/orders/:id/cancel` — Cancel an Open Order
**Auth required:** ✅ Yes (Bearer token)  
**URL param:** `:id` is the MongoDB `_id` of the order (get it from `GET /api/orders`)
**Purpose:** Cancel a limit or bracket order that is currently `OPEN`. Does NOT delete it — sets status to `CANCELLED`.

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

**Error Responses:**

| Status | Message | Meaning |
|---|---|---|
| `400` | `"Only OPEN orders can be cancelled"` | Order is already EXECUTED or already CANCELLED |
| `404` | `"Order not found"` | Wrong `_id` or order belongs to another user |

**Frontend Usage:**
```js
async function cancelOrder(orderId) {
  // orderId is the MongoDB _id from GET /api/orders response
  const res = await api.put(`/api/orders/${orderId}/cancel`);
  return res.data; // { success: true, message }
}
```

---

### PUT `/api/orders/:id/modify` — Modify an Open Order
**Auth required:** ✅ Yes (Bearer token)  
**URL param:** `:id` is the MongoDB `_id` of the order  
**Purpose:** Update the limit price, stop-loss, or target on a currently `OPEN` order.

**Request Body** *(send only what you want to change — all fields optional):*
```json
{
  "price": 140,
  "stopLoss": 120,
  "target": 180
}
```

**Rules:**
- `price` — only applies to `LIMIT` orders. Ignored on `MARKET` orders.
- `stopLoss` / `target` — applies to all order types, including bracket SELL orders.

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Order modified successfully",
  "order": {
    "_id": "...",
    "order_id": "ORD_1774772304396",
    "stock_id": 101,
    "side": "SELL",
    "order_type": "LIMIT",
    "quantity": 50,
    "price": 140,
    "stop_loss": 120,
    "target": 180,
    "status": "OPEN"
  }
}
```

**Error Responses:**

| Status | Message | Meaning |
|---|---|---|
| `400` | `"Only OPEN orders can be modified"` | Can't modify already EXECUTED or CANCELLED |
| `404` | `"Order not found"` | Wrong `_id` or belongs to a different user |

**Frontend Usage:**
```js
async function modifyOrder(orderId, updates) {
  // orderId = MongoDB _id from GET /api/orders
  // updates = { price?, stopLoss?, target? } — only send what changed
  const res = await api.put(`/api/orders/${orderId}/modify`, updates);
  return res.data; // { success, message, order }
}

// Example: Update stop-loss on a running bracket trade
await modifyOrder('64abc123...', { stopLoss: 135 });

// Example: Adjust limit price of pending LIMIT BUY
await modifyOrder('64abc456...', { price: 155, target: 200 });
```

---

## 5. Portfolio Route

### GET `/api/portfolio` — Get Current Holdings
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Get the user's current live portfolio — all stocks they hold with quantities and average prices.

**Success Response `200` (user has holdings):**
```json
{
  "_id": "...",
  "user_id": 10,
  "user_name": "Arjun",
  "positions": [
    {
      "stock_id": 101,
      "net_quantity": 200,
      "average_price": 150.00,
      "realized_pnl": 0,
      "current_price": 155.00,
      "unrealized_pnl": 1000.00,
      "overall_pnl": 1000.00
    },
    {
      "stock_id": 109,
      "net_quantity": 400,
      "average_price": 100.00,
      "realized_pnl": -250.00,
      "current_price": 95.00,
      "unrealized_pnl": -2000.00,
      "overall_pnl": -2250.00
    }
  ],
  "realized_pnl": -250.00,
  "unrealized_pnl": -1000.00,
  "overall_pnl": -1250.00
}
```

**Success Response `200` (user has no holdings yet):**
```json
{
  "positions": [],
  "realized_pnl": 0,
  "unrealized_pnl": 0,
  "overall_pnl": 0
}
```

**Position Field Reference:**

| Field | Description |
|---|---|
| `net_quantity` | Shares held. **Positive = LONG, Negative = SHORT** (e.g., `-50` = short 50 shares) |
| `position_type` | `"LONG"` or `"SHORT"` — use this for UI labels and conditional rendering |
| `average_price` | Average open price per share |
| `realized_pnl` | P&L locked in by closing trades on this specific stock |
| `current_price` | Live price (updated every 5 seconds via Yahoo Finance) |
| `unrealized_pnl` | Floating P&L — formula: `(current_price - average_price) * net_quantity` |
| `overall_pnl` | Per-stock total: `realized_pnl + unrealized_pnl` |

**Portfolio Level Fields:**

| Field | Description |
|---|---|
| `realized_pnl` | Total realized P&L across ALL stocks combined |
| `unrealized_pnl` | Total live floating P&L across ALL stocks combined |
| `overall_pnl` | Portfolio true standing: `realized_pnl + unrealized_pnl` |


> 💡 **Tip:** The `GET /api/portfolio` response payload computes all unrealized math and fetching of current live prices entirely on the backend server side! Simply map these values directly into your frontend cards.

---

## 6. Wallet Route

### GET `/api/wallet` — Get Account Equity & Risk Status
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Get the user's equity limits, how many shares they've used, and their available buying power.

> **Important:** `equity` is measured in **number of shares**, NOT dollars.

**Success Response `200`:**
```json
{
  "user_id": 10,
  "user_name": "Arjun",
  "equity": 1000,
  "used_equity": 600,
  "available_equity": 400,
  "loss_limit": 200
}
```

**Field Reference:**

| Field | Description |
|---|---|
| `equity` | Total shares allowed for **STOCKS** |
| `used_equity` | Total shares currently held across ALL stocks |
| `available_equity` | `equity - used_equity` |
| `commodity_equity` | Total lots allowed for **COMMODITIES** (default: 20 lots) |
| `used_commodity_equity` | Total lots currently held across all commodities |
| `available_commodity_equity` | `commodity_equity - used_commodity_equity` |
| `loss_limit` | The dollar threshold at which the system auto-liquidates everything |

> 💡 **Tip:** Each Commodity Lot contains **10 units** for P&L calculation. For example, if Gold moves $1, a 1-lot position results in $10 P&L.

**Margin Health Bar (frontend component suggestion):**
```js
// Show how close the user is to their equity limit
const equityUsedPercent = (wallet.used_equity / wallet.equity) * 100;

// Show how close they are to margin call
// Combine with live prices to calculate current unrealized loss
const marginRiskPercent = (currentUnrealizedLoss / wallet.loss_limit) * 100;
```

### GET `/api/wallet/transactions` — Transaction Ledger
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Full audit trail of all buy/sell financial transactions.

**Success Response `200`:**
```json
[
  {
    "transaction_id": "TXN_1774772304396_42",
    "user_id": 10,
    "user_name": "Arjun",
    "amount": 30000.00,
    "stock_id": 101,
    "quantity": 200,
    "side": "BUY",
    "timestamp": "2026-03-29T08:19:31.972Z"
  }
]
```

---

## 7. Error Handling Cheat Sheet

All errors follow this shape:
```json
{ "success": false, "message": "Human readable error" }
// OR
{ "error": "Error message" }
```

| HTTP Status | Meaning | Frontend Action |
|---|---|---|
| `400` | Bad request (invalid data, equity exceeded) | Show the `message` to the user |
| `401` | No/missing token | Redirect to login |
| `403` | Expired/invalid token | Clear token, redirect to login |
| `404` | Resource not found | Show "not found" state |
| `429` | Rate limited (too many requests) | Show "slow down" message, retry after 60s |
| `500` | Server error | Show generic "try again" message |

---

## 8. Recommended Frontend API Call Order

```
App loads
  ↓
1. GET /api/stocks  (public, no auth — show stock list on landing page)
  ↓
User logs in
  ↓
2. POST /api/auth/login  →  save token
  ↓
Dashboard loads (3 parallel calls):
  ↓
3a. GET /api/wallet    → show equity & risk meter
3b. GET /api/portfolio → show holdings table with live P&L
3c. GET /api/orders    → show order history table
  ↓
Polling (every 3-5 seconds):
  ↓
4. GET /api/portfolio  → P&L is updated on server-side every tick, just read
5. GET /api/wallet     → refresh available equity

User places a trade:
  ↓
6. POST /api/orders    → place order
7. GET /api/portfolio  → refresh holdings
8. GET /api/wallet     → refresh available equity

User cancels/modifies a pending limit order:
  ↓
9. PUT /api/orders/:id/cancel  OR  PUT /api/orders/:id/modify
```

---

## 9. The Prop-Firm Risk Engine — What Frontend Must Know

The backend runs a background engine every **3 seconds** that:
1. Checks all bracket orders (stop loss / target) → auto-executes if price hit
2. Scans every user's combined Realized + Unrealized loss across all positions

If a user's **effective total risk PnL falls below their `-loss_limit`:**
- All their open orders are force-cancelled (`CANCELLED_BY_MARGIN_CALL`)
- All their positions are force-sold at current market price
- The user is permanently flagged (`is_flagged = true`) restricting future orders.

*Algorithm Rule:* Positive Realized Profit does NOT increase the loss limit budget. If a user has `$5000` realized profit, their loss cap remains restricted as if their realized base was `$0`.

**Short positions are included in the margin calculation.** If a user shorts 100 shares at $200, and the price rises to $220, the unrealized loss is `$2,000`. This counts against the same `loss_limit` as regular long position losses.

**Margin call liquidation handles both directions:**
- **Long positions** → force MARKET SELL to close
- **Short positions** → force MARKET BUY to cover

**The frontend should:**
- Poll `/api/portfolio` every few seconds to auto-detect when a margin call zeroed the user's positions
- Show a **prominent red warning** when `Math.min(0, portfolio.realized_pnl) + portfolio.unrealized_pnl` approaches `-loss_limit`

> ⚠️ **Flagged Account Behavior:** Once a user is flagged, the `POST /api/orders` endpoint returns `400: "Account locked due to Margin Call"` for ALL new order attempts until an admin resets the `is_flagged` field to `false` in the database.

---

## 10. Complete API Summary Table

| Method | Route | Auth | URL Param | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | — | Create new account, get JWT token |
| `POST` | `/api/auth/login` | ❌ | — | Login, get JWT token |
| `GET` | `/api/stocks` | ❌ | — | Live stock prices |
| `POST` | `/api/orders` | ✅ | — | Place BUY or SELL order |
| `GET` | `/api/orders` | ✅ | — | User's full order history (sorted newest first) |
| `PUT` | `/api/orders/:id/cancel` | ✅ | MongoDB `_id` | Cancel an OPEN order |
| `PUT` | `/api/orders/:id/modify` | ✅ | MongoDB `_id` | Modify price/SL/target of an OPEN order |
| `GET` | `/api/portfolio` | ✅ | — | Holdings + live realized/unrealized/overall P&L |
| `GET` | `/api/wallet` | ✅ | — | Share equity limit + available buying power |
| `GET` | `/api/wallet/transactions` | ✅ | — | Full trade transaction ledger with quantities |
| `POST` | `/api/admin/create-admin` | ✅ (Superadmin) | — | Create a new admin account |
| `GET` | `/api/admin/users` | ✅ (Admin/Superadmin) | — | Fetch list of users (Superadmin sees all, Admin sees created by them) |
| `GET` | `/api/admin/users/:userId` | ✅ (Admin/Superadmin) | Custom `userId` | Fetch details of a specific user |
| `POST` | `/api/admin/create-user` | ✅ (Admin/Superadmin) | — | Create a new user account |
| `PUT` | `/api/admin/users/:userId` | ✅ (Admin/Superadmin) | Custom `userId` | Update user limits/flags |
| `GET` | `/api/admin/users/:userId/portfolio` | ✅ (Admin/Superadmin) | Custom `userId` | Fetch detailed portfolio for a specific user |
| `GET` | `/api/admin/users/:userId/wallet` | ✅ (Admin/Superadmin) | Custom `userId` | Fetch detailed wallet/limits for a specific user |
| `GET` | `/api/admin/users/:userId/transactions` | ✅ (Admin/Superadmin) | Custom `userId` | Fetch full transaction history for a specific user |

---

## 11. Admin Routes

### POST `/api/admin/create-admin`
**Auth required:** ✅ Yes (Superadmin Bearer token)  
**Purpose:** Create a new admin. Can only be performed by a Superadmin.

**Request Body:**
```json
{
  "user_name": "Admin Jane",
  "email": "jane@admin.com",
  "password": "securepassword123",
  "lot_limit": 100000,
  "loss_limit": 10000
}
```

### GET `/api/admin/users`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**Purpose:** Fetch a list of users.
- **Admin**: Returns all users created by this Admin.
- **Superadmin**: Returns every User and Admin in the system.

**Success Response `200`:**
```json
[
  {
    "user_id": 105,
    "user_name": "Trader John",
    "email": "john@trader.com",
    "role": "user",
    "equity": 5000,
    "commodity_equity": 20,
    "used_commodity_equity": 0,
    "loss_limit": 500,
    "is_flagged": false,
    "can_trade_stocks": true,
    "can_trade_commodities": true,
    "created_by": 101,
    "createdAt": "2026-03-30T10:00:00.000Z"
  }
]
```
> ⚠️ **Terminology Note:** In the database and API responses, **"lot limit"** is strictly represented by the field `commodity_equity`.

### GET `/api/admin/users/:userId`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**URL param:** `:userId` is the custom numeric ID of the user (e.g., `105`)  
**Purpose:** Fetch the details of a single user. Admins can only fetch users they created. Superadmins can fetch anyone.

**Success Response `200`:**
*(Same JSON object structure as the list above)*

### POST `/api/admin/create-user`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**Purpose:** Create a new user. The `lot_limit` (commodity lots) is deducted from the Admin/Superadmin's pool. (User `equity` for stocks is automatically set to default $5000).

**Request Body:**
```json
{
  "user_name": "Trader John",
  "email": "john@trader.com",
  "password": "securepassword123",
  "lot_limit": 50,
  "loss_limit": 500,
  "can_trade_stocks": true,
  "can_trade_commodities": true
}
```

### PUT `/api/admin/users/:userId`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**URL param:** `:userId` is the custom numeric ID of the user  
**Purpose:** Update a user's limits or trading permissions. An admin can only update users they created. Superadmins can update anyone.

**Request Body** *(send only what you want to change):*
```json
{
  "lot_limit": 60,
  "loss_limit": 600,
  "is_flagged": false,
  "can_trade_stocks": false,
  "can_trade_commodities": true
}
```
> 💡 **Tip:** When updating the lot limit from the frontend, send it as `lot_limit` in the request body. The backend will automatically map and save this as `commodity_equity` in the database to remain compatible with the trading engine.
### GET `/api/admin/users/:userId/portfolio`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**Purpose:** Fetch the real-time portfolio (positions, unrealized P&L, overall P&L) of a specific user.

### GET `/api/admin/users/:userId/wallet`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**Purpose:** Fetch the wallet status (equity, used equity, commodity lots) of a specific user.

### GET `/api/admin/users/:userId/transactions`
**Auth required:** ✅ Yes (Admin or Superadmin Bearer token)  
**Purpose:** Fetch the full transaction history (buy/sell ledger) of a specific user.
