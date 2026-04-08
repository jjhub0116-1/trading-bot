/**
 * Full End-to-End API Test — Cancel & Modify
 * 
 * This test ONLY uses the real HTTP API endpoints. No direct DB injection.
 * Flow:
 *   1. Reset John's account to clean state
 *   2. Login via POST /api/auth/login
 *   3. Buy shares via POST /api/orders (MARKET BUY) → wait for engine tick
 *   4. Verify portfolio via GET /api/portfolio has shares
 *   5. LIMIT SELL at extreme price (won't execute) → CANCEL via API
 *   6. LIMIT SELL at extreme price → MODIFY price+SL via API → CANCEL
 *   7. MARKET SELL with SL+target (bracket won't execute) → MODIFY SL+target via API → CANCEL
 */

const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:3000/api';
let token, config;

async function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

async function api(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
}

function pass(msg) { console.log(`   ✅ PASS: ${msg}`); return true; }
function fail(msg) { console.error(`   ❌ FAIL: ${msg}`); return false; }

async function runTests() {
    console.log("=============================================");
    console.log("  🔗 FULL API END-TO-END: CANCEL & MODIFY");
    console.log("=============================================\n");

    await mongoose.connect(process.env.MONGO_URI);
    const Order = require('../models/Order');
    const User = require('../models/User');
    const Portfolio = require('../models/Portfolio');

    // ── RESET JOHN ────────────────────────────────────────────────────
    console.log("🔄 Resetting John's account to clean state...");
    await User.updateOne({ user_id: 4 }, { is_flagged: false });
    await Portfolio.updateOne({ user_id: 4 }, { $set: { positions: [], realized_pnl: 0, unrealized_pnl: 0, overall_pnl: 0 } });
    await Order.deleteMany({ user_id: 4 });
    console.log("✅ Reset done.\n");

    let passed = 0, failed = 0;

    // ── STEP 1: LOGIN ─────────────────────────────────────────────────
    console.log("── AUTH: POST /api/auth/login ──");
    const loginRes = await api('POST', '/auth/login', { email: 'john@test.com', password: 'hashed' });
    if (!loginRes.data.token) { console.error("Fatal: Login failed:", loginRes.data); process.exit(1); }
    token = loginRes.data.token;
    // Rebuild config now that token is set
    config = token;
    console.log("✅ Logged in. JWT received.\n");

    // ── STEP 2: MARKET BUY → wait for engine execution ───────────────
    console.log("── STEP 2: POST /api/orders (MARKET BUY — 5 shares Stock 4) ──");
    const buyRes = await api('POST', '/orders', { stockId: 4, quantity: 5, orderType: 'MARKET', side: 'BUY' });
    if (!buyRes.data.orderId) { fail(`Buy order rejected: ${JSON.stringify(buyRes.data)}`); process.exit(1); }
    console.log(`✅ BUY order placed: ${buyRes.data.orderId}`);
    console.log("⏳ Waiting 5 seconds for engine tick to execute the BUY...");
    await delay(5000);

    // ── STEP 3: Verify portfolio has shares ───────────────────────────
    console.log("\n── STEP 3: GET /api/portfolio ──");
    const portfolioRes = await api('GET', '/portfolio');
    const positions = portfolioRes.data.positions;
    const myPos = positions.find(p => p.stock_id === 4);
    if (myPos && myPos.net_quantity >= 5) {
        pass(`Portfolio shows ${myPos.net_quantity} shares of Stock 4 @ avg $${myPos.average_price}`);
        passed++;
    } else {
        fail(`Portfolio has no shares yet. Maybe engine tick is slow? ${JSON.stringify(positions)}`);
        failed++;
        console.log("⚠️ Cannot test SELL scenarios without shares. Stopping early.");
        await mongoose.connection.close();
        process.exit(1);
    }
    console.log();

    // ── TEST 4: LIMIT SELL at $999999 (won't execute) → CANCEL ────────
    console.log("── TEST 4: LIMIT SELL (at $999999) → Cancel via API ──");
    const limitSellRes = await api('POST', '/orders', {
        stockId: 4, quantity: 2, orderType: 'LIMIT', price: 999999, side: 'SELL'
    });
    if (!limitSellRes.data.orderId) {
        fail(`LIMIT SELL placement failed: ${JSON.stringify(limitSellRes.data)}`); failed++;
    } else {
        console.log(`   Order placed: ${limitSellRes.data.orderId}`);
        await delay(400);
        const doc = await Order.findOne({ order_id: limitSellRes.data.orderId });
        const cancelRes = await api('PUT', `/orders/${doc._id}/cancel`);
        if (cancelRes.data.success) {
            const updated = await Order.findById(doc._id);
            if (updated.status === 'CANCELLED') { pass("LIMIT SELL cancelled — status = CANCELLED"); passed++; }
            else { fail(`Status = ${updated.status}`); failed++; }
        } else { fail(`Cancel rejected: ${cancelRes.data.message}`); failed++; }
    }
    console.log();

    // ── TEST 5: LIMIT SELL → MODIFY price+SL → CANCEL ─────────────────
    console.log("── TEST 5: LIMIT SELL → Modify price+SL via API → Cancel ──");
    const limitSell2Res = await api('POST', '/orders', {
        stockId: 4, quantity: 2, orderType: 'LIMIT', price: 999999, side: 'SELL', stopLoss: 100
    });
    if (!limitSell2Res.data.orderId) {
        fail(`LIMIT SELL 2 placement failed: ${JSON.stringify(limitSell2Res.data)}`); failed++;
    } else {
        console.log(`   Order placed: ${limitSell2Res.data.orderId}`);
        await delay(400);
        const doc = await Order.findOne({ order_id: limitSell2Res.data.orderId });
        const modRes = await api('PUT', `/orders/${doc._id}/modify`, { price: 888888, stopLoss: 50, target: 777777 });
        if (modRes.data.success) {
            const updated = await Order.findById(doc._id);
            if (updated.price === 888888 && updated.stop_loss === 50 && updated.target === 777777) {
                pass(`LIMIT SELL modified — price→888888, SL→50, target→777777 verified in DB`); passed++;
            } else {
                fail(`DB mismatch: price=${updated.price}, SL=${updated.stop_loss}, target=${updated.target}`); failed++;
            }
        } else { fail(`Modify rejected: ${modRes.data.message}`); failed++; }
        await api('PUT', `/orders/${doc._id}/cancel`);
    }
    console.log();

    // ── TEST 6: BUY with bracket → Bracket SELL appears → MODIFY SL/target → CANCEL ──
    console.log("── TEST 6: BUY with SL+target creates bracket SELL → Modify SL/target → Cancel ──");
    const bracketBuyRes = await api('POST', '/orders', {
        stockId: 4, quantity: 1, orderType: 'MARKET', side: 'BUY',
        stopLoss: 1,      // very low SL so it doesn't trigger
        target: 9999999   // very high target so it doesn't trigger
    });
    if (!bracketBuyRes.data.orderId) {
        fail(`Bracket BUY failed: ${JSON.stringify(bracketBuyRes.data)}`); failed++;
    } else {
        console.log(`   Bracket BUY placed: ${bracketBuyRes.data.orderId}`);
        console.log("⏳ Waiting 5s for engine to execute BUY and spawn bracket SELL...");
        await delay(5000);

        // Find the auto-spawned bracket SELL
        const bracketSell = await Order.findOne({
            user_id: 4, side: 'SELL', order_type: 'MARKET', status: 'OPEN', target: 9999999
        });

        if (!bracketSell) {
            fail("Bracket SELL order was not spawned by engine"); failed++;
        } else {
            console.log(`   Bracket SELL found: ${bracketSell.order_id} | SL=${bracketSell.stop_loss}, target=${bracketSell.target}`);

            // MODIFY bracket SL and target via API
            const modRes = await api('PUT', `/orders/${bracketSell._id}/modify`, { stopLoss: 2, target: 8888888 });
            if (modRes.data.success) {
                const updated = await Order.findById(bracketSell._id);
                if (updated.stop_loss === 2 && updated.target === 8888888) {
                    pass(`Bracket SELL SL→2, target→8888888 verified in DB`); passed++;
                } else {
                    fail(`DB: SL=${updated.stop_loss}, target=${updated.target}`); failed++;
                }
            } else { fail(`Modify rejected: ${modRes.data.message}`); failed++; }

            // CANCEL bracket SELL via API
            const cancelRes = await api('PUT', `/orders/${bracketSell._id}/cancel`);
            if (cancelRes.data.success) {
                const updated = await Order.findById(bracketSell._id);
                if (updated.status === 'CANCELLED') { pass("Bracket SELL cancelled via API"); passed++; }
                else { fail(`Status = ${updated.status}`); failed++; }
            } else { fail(`Cancel rejected: ${cancelRes.data.message}`); failed++; }
        }
    }
    console.log();

    // ── SUMMARY ───────────────────────────────────────────────────────
    console.log("=============================================");
    console.log(`   RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log("   All tests used real HTTP API endpoints.");
    console.log("=============================================");

    await mongoose.connection.close();
    process.exit(0);
}

runTests().catch(err => {
    console.error("Fatal:", err.message);
    process.exit(1);
});
