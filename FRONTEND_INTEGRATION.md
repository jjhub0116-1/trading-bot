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
  { "stock_id": 101, "symbol": "AAPL",  "stock_name": "Apple Inc",   "current_price": 150.00 },
  { "stock_id": 102, "symbol": "GOOGL", "stock_name": "Alphabet Inc", "current_price": 2800.00 },
  { "stock_id": 103, "symbol": "MSFT",  "stock_name": "Microsoft Corp","current_price": 320.00 }
]
```

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
| `quantity` | Number | ✅ | Number of shares to buy/sell |
| `orderType` | String | ✅ | `"MARKET"` or `"LIMIT"` |
| `price` | Number | ✅ | Send `0` for MARKET orders. For LIMIT orders, send the limit price |
| `stopLoss` | Number | ❌ | Optional. If price drops to this, auto-sell triggers |
| `target` | Number | ❌ | Optional. If price rises to this, auto-sell triggers |
| `side` | String | ✅ | `"BUY"` or `"SELL"` |

**Order Type Guide:**

| Scenario | orderType | price | stopLoss | target |
|---|---|---|---|---|
| Buy now at market price | `MARKET` | `0` | `null` | `null` |
| Buy now with safety bracket | `MARKET` | `0` | `120` | `200` |
| Buy only if price drops to $140 | `LIMIT` | `140` | `null` | `null` |
| Sell now at market price | `MARKET` | `0` | `null` | `null` |

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
| `400` | `"Insufficient Equity Limits (Share Count Exceeded)"` | User's total shares held + new qty exceeds their equity limit |
| `400` | `"Insufficient Shares (Or locked in open orders)"` | Trying to sell more shares than they own or have unlocked |
| `400` | `"Stock Not Found"` | The `stockId` doesn't exist in the database |
| `401` | `"Unauthorized..."` | Missing or no Authorization header |
| `403` | `"Critical Identity Fault..."` | Token expired or invalid |

**Frontend Usage:**
```js
async function placeBuyOrder(stockId, quantity, stopLoss = null, target = null) {
  const res = await api.post('/api/orders', {
    stockId,
    quantity,
    orderType: 'MARKET',
    price: 0,
    stopLoss,
    target,
    side: 'BUY'
  });
  return res.data; // { success, message, orderId }
}
```

---

### GET `/api/orders` — Get Order History
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Fetch all orders (open, executed, cancelled) for the logged-in user.

**Success Response `200`:**
```json
[
  {
    "_id": "...",
    "order_id": "ORD_1774772304396",
    "user_id": 10,
    "user_name": "Arjun",
    "stock_id": 101,
    "side": "BUY",
    "order_type": "MARKET",
    "quantity": 200,
    "price": 150,
    "stop_loss": null,
    "target": null,
    "status": "EXECUTED",
    "createdAt": "2026-03-29T08:19:31.972Z"
  }
]
```

**Order `status` values:**

| Status | Meaning |
|---|---|
| `OPEN` | Waiting to be executed (LIMIT orders, bracket SELL orders) |
| `EXECUTED` | Order filled successfully |
| `CANCELLED` | Manually cancelled |
| `CANCELLED_BY_MARGIN_CALL` | Cancelled automatically when a margin call liquidated the account |

**Frontend Usage:**
```js
const orders = await api.get('/api/orders');
// orders.data is sorted newest first
```

---

### PUT `/api/orders/:id/cancel` — Cancel an Open Order
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Cancel a limit or bracket order that is currently `OPEN`.

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### PUT `/api/orders/:id/modify` — Modify an Open Order
**Auth required:** ✅ Yes (Bearer token)  
**Purpose:** Update the variables (`price`, `stopLoss`, or `target`) of a currently `OPEN` order.

**Request Body:**
```json
{
  "price": 140,
  "stopLoss": 120,
  "target": 180
}
```
*(All fields in the body are optional; only send what you wish to modify).*

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Order modified successfully",
  "order": { /* updated order object */ }
}
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

**Field Reference:**

| Field | Description |
|---|---|
| `positions[]` | Array of every stock the user currently holds |
| `positions[].stock_id` | Which stock |
| `positions[].net_quantity` | Shares currently held (will be `0` after a full sell) |
| `positions[].average_price` | Weighted average price they paid per share |
| `positions[].realized_pnl` | Profit/Loss already locked in by selling this stock |
| `positions[].current_price` | Live current value of the stock dynamically evaluated |
| `positions[].unrealized_pnl` | Live floating PnL dynamically evaluated |
| `positions[].overall_pnl` | Computed total PnL per stock (`realized` + `unrealized`) |
| `realized_pnl` | **Total realized P&L across ALL stocks combined** |
| `unrealized_pnl` | **Total live floating P&L across ALL stocks combined** |
| `overall_pnl` | **Portfolio true standing (`realized` + `unrealized`)** |

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
| `equity` | Total shares the user is allowed to hold at once (set by admin) |
| `used_equity` | Total shares currently held across ALL stocks |
| `available_equity` | `equity - used_equity` — how many more shares they can buy |
| `loss_limit` | The dollar threshold at which the system auto-liquidates everything |

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

**The frontend should:**
- Poll `/api/portfolio` every few seconds to auto-detect when a margin call zeroed the user's positions
- Show a **prominent red warning** when `Math.min(0, portfolio.realized_pnl) + portfolio.unrealized_pnl` approaches `-loss_limit`

> ⚠️ **Flagged Account Behavior:** Once a user is flagged, the `POST /api/orders` endpoint returns `400: "Account locked due to Margin Call"` for ALL new order attempts until an admin resets the `is_flagged` field to `false` in the database.

---

## 10. Complete API Summary Table

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Create new account, get JWT token |
| `POST` | `/api/auth/login` | ❌ | Login, get JWT token |
| `GET` | `/api/stocks` | ❌ | Live stock prices |
| `POST` | `/api/orders` | ✅ | Place BUY or SELL order |
| `GET` | `/api/orders` | ✅ | User's full order history |
| `PUT` | `/api/orders/:id/modify` | ✅ | Modify an OPEN limits order |
| `PUT` | `/api/orders/:id/cancel` | ✅ | Cancel an OPEN limit order |
| `GET` | `/api/portfolio` | ✅ | Current holdings + Dynamic P&L payload |
| `GET` | `/api/wallet` | ✅ | Equity limits + available buying power |
| `GET` | `/api/wallet/transactions` | ✅ | Full financial transaction ledger |
