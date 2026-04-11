/**
 * Short Selling End-to-End Verification
 * Tests: short open → negative qty, short cover → realized P&L, P&L direction
 */
const mongoose = require('mongoose');
require('dotenv').config();
const API_BASE = 'http://127.0.0.1:3000/api';
let token;

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    return res.json();
}

function pass(msg) { console.log(`   ✅ PASS: ${msg}`); return true; }
function fail(msg) { console.error(`   ❌ FAIL: ${msg}`); return false; }

async function run() {
    console.log("=============================================");
    console.log("  📉 SHORT SELLING — END-TO-END VERIFICATION");
    console.log("=============================================\n");

    await mongoose.connect(process.env.MONGO_URI);
    const Portfolio = require('../models/Portfolio');
    const Order = require('../models/Order');
    const User = require('../models/User');

    // Reset John
    await User.updateOne({ user_id: 4 }, { is_flagged: false });
    await Portfolio.updateOne({ user_id: 4 }, { $set: { positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 } });
    await Order.deleteMany({ user_id: 4 });
    console.log("🔄 John reset to clean state.\n");

    // Login
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log("✅ Logged in.\n");

    let passed = 0, failed = 0;

    // ─── TEST 1: SHORT OPEN — Sell without owning shares ───────────────
    console.log("── TEST 1: Short SELL 5 shares (no prior holdings) ──");
    const shortRes = await api('POST', '/orders', {
        stockId: 4, quantity: 5, orderType: 'MARKET', side: 'SELL'
    });
    if (!shortRes.orderId) { fail(`Order rejected: ${shortRes.message || shortRes.error}`); failed++; }
    else {
        console.log(`   Order placed: ${shortRes.orderId}`);
        console.log("⏳ Waiting 5s for engine...");
        await delay(5000);
        const portfolio = await Portfolio.findOne({ user_id: 4 });
        const pos = portfolio?.positions?.find(p => p.stock_id === 4);
        if (pos && pos.net_quantity === -5) {
            pass(`net_quantity = ${pos.net_quantity} (SHORT confirmed! avg_price=$${pos.average_price.toFixed(2)})`);
            passed++;
        } else {
            fail(`Expected net_quantity=-5, got: ${JSON.stringify(pos)}`); failed++;
        }
    }
    console.log();

    // ─── TEST 2: VERIFY unrealized P&L is computed for short position ───
    console.log("── TEST 2: Unrealized P&L direction check for short ──");
    const portfolioRoute = await api('GET', '/portfolio');
    const pos2 = portfolioRoute.positions?.find(p => p.stock_id === 4);
    if (pos2) {
        console.log(`   Position: qty=${pos2.net_quantity}, avg=$${pos2.average_price}, current=$${pos2.current_price}`);
        console.log(`   Unrealized P&L: $${pos2.unrealized_pnl?.toFixed(2)}`);
        // If price dropped, P&L should be positive. If price rose, negative. Either way formula must be non-zero.
        const expectedPnl = (pos2.current_price - pos2.average_price) * pos2.net_quantity;
        if (Math.abs(pos2.unrealized_pnl - expectedPnl) < 0.01) {
            pass(`Unrealized P&L formula correct: (${pos2.current_price}-${pos2.average_price})*${pos2.net_quantity} = $${expectedPnl.toFixed(2)}`);
            passed++;
        } else {
            fail(`P&L mismatch: expected $${expectedPnl.toFixed(2)}, got $${pos2.unrealized_pnl}`); failed++;
        }
    } else { fail("Position not in portfolio response"); failed++; }
    console.log();

    // ─── TEST 3: COVER SHORT — Buy back the 5 shares ───────────────────
    console.log("── TEST 3: Cover the short (BUY 5 to close) ──");
    const coverRes = await api('POST', '/orders', {
        stockId: 4, quantity: 5, orderType: 'MARKET', side: 'BUY'
    });
    if (!coverRes.orderId) { fail(`Cover order rejected: ${coverRes.message}`); failed++; }
    else {
        console.log(`   Cover order placed: ${coverRes.orderId}`);
        console.log("⏳ Waiting 5s for engine...");
        await delay(5000);
        const portfolio = await Portfolio.findOne({ user_id: 4 });
        const posAfter = portfolio?.positions?.find(p => p.stock_id === 4);
        if (!posAfter || posAfter.net_quantity === 0) {
            pass(`Position closed! realized_pnl = $${portfolio.realized_pnl?.toFixed(2)}`); passed++;
        } else {
            fail(`Position still open: net_quantity=${posAfter?.net_quantity}`); failed++;
        }
    }
    console.log();

    // ─── TEST 4: EQUITY protection — Reject if total exposure would exceed equity ──
    console.log("── TEST 4: Equity protection — short 10000 shares (over limit) ──");
    const overRes = await api('POST', '/orders', {
        stockId: 4, quantity: 10000, orderType: 'MARKET', side: 'SELL'
    });
    if (!overRes.success && overRes.message?.includes('Equity')) {
        pass(`Correctly rejected: "${overRes.message}"`); passed++;
    } else {
        fail(`Should have been rejected, got: ${JSON.stringify(overRes)}`); failed++;
    }
    console.log();

    // ─── SUMMARY ────────────────────────────────────────────────────────
    console.log("=============================================");
    console.log(`   RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log("=============================================");

    await mongoose.connection.close();
    process.exit(0);
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
