const mongoose = require('mongoose');
const { connect } = require('../config/db');
require('dotenv').config();

const API_BASE = 'http://localhost:3000/api';

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
    console.log("=========================================");
    console.log("   📈 PROFIT & LOSS E2E TEST SUITE");
    console.log("=========================================\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Stock = require('../models/Stock');
        const User = require('../models/User');
        const Order = require('../models/Order');
        const Portfolio = require('../models/Portfolio');

        // 1. Reset Environment
        await Stock.updateOne({ stock_id: 4 }, { current_price: 100 });
        await Order.deleteMany({ user_id: 4 });
        await Portfolio.deleteMany({ user_id: 4 });
        await User.updateOne({ user_id: 4 }, { is_flagged: false, equity: 15000 });

        console.log("✅ Environment Reset: MSFT price set strictly to $100.\n");

        // Auth
        let authRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
        });
        const authData = await authRes.json();
        const config = { 'Authorization': `Bearer ${authData.token}`, 'Content-Type': 'application/json' };

        // Test Phase 1: Buy and Check Unrealized
        console.log("🛒 [PHASE 1]: Buying 10 shares of MSFT at $100");
        await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: config,
            body: JSON.stringify({ stockId: 4, quantity: 10, orderType: 'MARKET', side: 'BUY' })
        });
        await delay(4000); // let engine execute

        // Change price to create Unrealized Profit
        await Stock.updateOne({ stock_id: 4 }, { current_price: 150 });
        console.log("📈 MSFT jumps to $150. (Expected Unrealized P&L: +$500)");
        
        let portRes = await fetch(`${API_BASE}/portfolio`, { headers: config });
        let portData = await portRes.json();
        console.log(`📊 PORTFOLIO -> Realized: $${portData.realized_pnl} | Unrealized: $${portData.unrealized_pnl} | Overall: $${portData.overall_pnl}`);
        if(portData.unrealized_pnl === 500) console.log("   ✅ Unrealized Math is PERFECT!\n");
        else console.error("   ❌ Unrealized Math Failed!\n");


        // Test Phase 2: Partial Sell to lock in some Realized
        console.log("💰 [PHASE 2]: Selling 4 shares of MSFT at $150");
        await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: config,
            body: JSON.stringify({ stockId: 4, quantity: 4, orderType: 'MARKET', side: 'SELL' })
        });
        await delay(4000); // let engine execute

        portRes = await fetch(`${API_BASE}/portfolio`, { headers: config });
        portData = await portRes.json();
        // 4 shares sold * ($150 - $100) = $200 Realized Profit
        // 6 shares kept * ($150 - $100) = $300 Unrealized Profit
        console.log("📉 Sold 4 shares at $150. (Expected Realized: +$200, Remaining Unrealized: +$300)");
        console.log(`📊 PORTFOLIO -> Realized: $${portData.realized_pnl} | Unrealized: $${portData.unrealized_pnl} | Overall: $${portData.overall_pnl}`);
        if(portData.realized_pnl === 200 && portData.unrealized_pnl === 300) console.log("   ✅ Realized Partial Math is PERFECT!\n");
        else console.error("   ❌ Realized Partial Math Failed!\n");


        // Test Phase 3: Completely Liquidate position
        console.log("💸 [PHASE 3]: Selling remaining 6 shares of MSFT at $150");
        await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: config,
            body: JSON.stringify({ stockId: 4, quantity: 6, orderType: 'MARKET', side: 'SELL' })
        });
        await delay(4000); // let engine execute

        // Change price dramatically to prove Unrealized doesn't falsely calculate off sold shares
        await Stock.updateOne({ stock_id: 4 }, { current_price: 9999 });

        portRes = await fetch(`${API_BASE}/portfolio`, { headers: config });
        portData = await portRes.json();
        // 6 additional shares sold * $50 profit = $300 perfectly booked. Total Realized: $500.
        // Unrealized: $0. Overall: $500.
        console.log("📉 Sold remaining 6 shares at $150. Evaluated independent stock spike to $9999.");
        console.log("   (Expected Realized: +$500 permanently booked, Unrealized: $0)");
        console.log(`📊 PORTFOLIO -> Realized: $${portData.realized_pnl} | Unrealized: $${portData.unrealized_pnl} | Overall: $${portData.overall_pnl}`);
        
        if(portData.realized_pnl === 500 && portData.unrealized_pnl === 0) console.log("   ✅ Permanent Total Booking Math is PERFECT!\n");
        else console.error("   ❌ Total Booking Math Failed!\n");

    } catch (err) {
        console.error("Test Setup failed:", err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

runTests();
