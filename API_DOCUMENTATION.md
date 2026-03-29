# Trading Bot REST API Documentation

Welcome to the official developer documentation for the Trading Bot Engine. This document contains the exact schemas required for frontend developers (React, Vue, Swift, etc.) to connect to the backend securely and seamlessly.

## Base URL
**Production Base URL:** `https://trading-bot-e6e6.onrender.com/api`

---

## 🔒 1. Authentication

### **User Login**
Authenticates a user and retrieves their base information.
- **Method:** `POST`
- **Route:** `/auth/login`
- **Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "email": "smriti@test.com",
  "password": "hashed"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "user_id": 2,
    "name": "Smriti",
    "email": "smriti@test.com",
    "role": "Trader"
  }
}
```

---

## 📈 2. Order Execution

### **Place a Trade**
Fires a massive order payload straight into the trade execution engine. It handles Unified Bracket Orders automatically.
- **Method:** `POST`
- **Route:** `/orders`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer <YOUR_JWT_TOKEN>`

**Request Body:**
```json
{
  "stockId": 2,
  "quantity": 5,
  "orderType": "MARKET",
  "price": 0,
  "stopLoss": 90,
  "target": 170,
  "side": "BUY"
}
```

**Notes:**
- `orderType`: Currently supports `"MARKET"` or `"LIMIT"`.
- `side`: Currently supports `"BUY"` or `"SELL"`.
- `price`: Set to `0` for Market Orders.
- `stopLoss` and `target` triggers are optional.

### **Get User Trade History**
Fetches massive lists of executed and open orders natively exclusively for the authenticated user.
- **Method:** `GET`
- **Route:** `/orders`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## 💼 3. Portfolio & Balances

### **Fetch Active Portfolio**
Retrieves all completely open asset positions held mathematically dynamically.
- **Method:** `GET`
- **Route:** `/portfolio`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`

### **Get Wallet Balance**
Retrieves the authorized user's available cash natively securely.
- **Method:** `GET`
- **Route:** `/wallet`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`

### **Get Wallet Transaction Ledger**
Retrieves the chronologically authenticated list of every dollar moving in and out natively.
- **Method:** `GET`
- **Route:** `/wallet/transactions`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`

---

## 📊 4. Market Data

### **Get All Stocks**
Fetches the current live streaming price data of all globally supported stocks natively.
- **Method:** `GET`
- **Route:** `/stocks`

**Success Response (200 OK):**
```json
[
  {
    "stock_id": 1,
    "symbol": "AAPL",
    "stock_name": "Apple",
    "current_price": 175.50
  },
  {
    "stock_id": 2,
    "symbol": "NOK",
    "stock_name": "Nokia",
    "current_price": 105.00
  }
]
```

---

## Technical Notes for Frontend Developers
- **CORS:** Ensure your framework cleanly accepts JSON. The Express `.use(express.json())` parser natively handles strictly formatted payloads.
- **Websockets:** A live data stream is fully supported on the backend natively and updates the DB aggressively. Always GET the `/stocks` route dynamically to pull millisecond fresh data mechanically.
