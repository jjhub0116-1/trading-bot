const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:3000/api';
let token, config;
let Order;

async function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

// ─── Helper: place order via API ───────────────────────────────────────
async function placeOrder(body) {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: config, body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.orderId) throw new Error(`Place order failed: ${JSON.stringify(data)}`);
    await delay(600);
    const doc = await Order.findOne({ order_id: data.orderId });
    if (!doc) throw new Error(`Order not found in DB: ${data.orderId}`);
    return doc;
}

// ─── Helper: cancel via API ────────────────────────────────────────────
async function cancelOrder(mongoId) {
    const res = await fetch(`${API_BASE}/orders/${mongoId}/cancel`, { method: 'PUT', headers: config });
    return res.json();
}

// ─── Helper: modify via API ────────────────────────────────────────────
async function modifyOrder(mongoId, body) {
    const res = await fetch(`${API_BASE}/orders/${mongoId}/modify`, { method: 'PUT', headers: config, body: JSON.stringify(body) });
    return res.json();
}

function pass(msg) { console.log(`   ✅ PASS: ${msg}`); }
function fail(msg) { console.error(`   ❌ FAIL: ${msg}`); }

// ─── MAIN ──────────────────────────────────────────────────────────────
async function runTests() {
    console.log("=========================================");
    console.log("  📋 CANCEL & MODIFY — FULL SCENARIO TEST");
    console.log("=========================================\n");

    await mongoose.connect(process.env.MONGO_URI);
    Order = require('../models/Order');

    // Auth
    const authRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
    });
    const authData = await authRes.json();
    token = authData.token;
    config = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    console.log("✅ Auth OK\n");

    let passed = 0, failed = 0;

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 1: CANCEL a pending LIMIT BUY
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 1: Cancel a pending LIMIT BUY ──");
    try {
        const doc = await placeOrder({ stockId: 4, quantity: 2, orderType: 'LIMIT', price: 50, side: 'BUY' });
        console.log(`   Order placed: ${doc.order_id} | status=${doc.status}`);

        const result = await cancelOrder(doc._id.toString());
        if (result.success) {
            const updated = await Order.findById(doc._id);
            if (updated.status === 'CANCELLED') { pass("Status is CANCELLED"); passed++; }
            else { fail(`Status is ${updated.status}`); failed++; }
        } else { fail(result.message); failed++; }
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 2: MODIFY price of pending LIMIT BUY
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 2: Modify price of pending LIMIT BUY ──");
    try {
        const doc = await placeOrder({ stockId: 4, quantity: 2, orderType: 'LIMIT', price: 50, side: 'BUY' });
        console.log(`   Order placed: ${doc.order_id} | price=${doc.price}`);

        const result = await modifyOrder(doc._id.toString(), { price: 75, stopLoss: 40 });
        if (result.success) {
            const updated = await Order.findById(doc._id);
            if (updated.price === 75 && updated.stop_loss === 40) { pass(`price→75 SL→40 verified in DB`); passed++; }
            else { fail(`DB has price=${updated.price} SL=${updated.stop_loss}`); failed++; }
        } else { fail(result.message); failed++; }

        // Cleanup
        await cancelOrder(doc._id.toString());
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 3: CANCEL a Bracket SELL (MARKET SELL with stop_loss+target)
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 3: Cancel Bracket SELL (MARKET, stop_loss + target) ──");
    try {
        // Inject a bracket sell directly into DB (bypass restrictions for test isolation)
        const bracketId = 'ORD_TEST_BRACKET_' + Date.now();
        await Order.create({
            order_id: bracketId,
            user_id: 4, user_name: 'John', stock_id: 4,
            side: 'SELL', order_type: 'MARKET',
            quantity: 5, price: 0,
            stop_loss: 100, target: 500,
            status: 'OPEN'
        });
        await delay(300);
        const doc = await Order.findOne({ order_id: bracketId });
        console.log(`   Bracket order: ${bracketId} | SL=${doc.stop_loss} target=${doc.target}`);

        const result = await cancelOrder(doc._id.toString());
        if (result.success) {
            const updated = await Order.findById(doc._id);
            if (updated.status === 'CANCELLED') { pass("Bracket SELL cancelled — engine will stop watching"); passed++; }
            else { fail(`Status is ${updated.status}`); failed++; }
        } else { fail(result.message); failed++; }
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 4: MODIFY Stop-Loss of a Bracket SELL
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 4: Modify Stop-Loss of a Bracket SELL ──");
    try {
        const bracketId = 'ORD_TEST_BRACKET2_' + Date.now();
        await Order.create({
            order_id: bracketId,
            user_id: 4, user_name: 'John', stock_id: 4,
            side: 'SELL', order_type: 'MARKET',
            quantity: 5, price: 0,
            stop_loss: 100, target: 500,
            status: 'OPEN'
        });
        await delay(300);
        const doc = await Order.findOne({ order_id: bracketId });
        console.log(`   Bracket order: ${bracketId} | SL=${doc.stop_loss}, target=${doc.target}`);

        const result = await modifyOrder(doc._id.toString(), { stopLoss: 150, target: 600 });
        if (result.success) {
            const updated = await Order.findById(doc._id);
            if (updated.stop_loss === 150 && updated.target === 600) { pass(`SL→150, target→600 verified in DB`); passed++; }
            else { fail(`DB has SL=${updated.stop_loss} target=${updated.target}`); failed++; }
        } else { fail(result.message); failed++; }

        // Cleanup
        await cancelOrder(doc._id.toString());
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 5: Cancel on an ALREADY EXECUTED order (should REJECT)
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 5: Cancel ALREADY EXECUTED order (must reject) ──");
    try {
        const execId = 'ORD_TEST_EXEC_' + Date.now();
        await Order.create({
            order_id: execId,
            user_id: 4, user_name: 'John', stock_id: 4,
            side: 'BUY', order_type: 'MARKET',
            quantity: 1, price: 300, status: 'EXECUTED'
        });
        const doc = await Order.findOne({ order_id: execId });

        const result = await cancelOrder(doc._id.toString());
        if (!result.success && result.message.includes('OPEN')) {
            pass(`Correctly rejected: "${result.message}"`); passed++;
        } else {
            fail(`Should have rejected, got: ${JSON.stringify(result)}`); failed++;
        }
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─────────────────────────────────────────────────────────────────
    // SCENARIO 6: Modify price of MARKET SELL (should ignore price, succeed)
    // ─────────────────────────────────────────────────────────────────
    console.log("── TEST 6: Modify price of MARKET SELL — price ignored, SL updated ──");
    try {
        const mktId = 'ORD_TEST_MKT_' + Date.now();
        await Order.create({
            order_id: mktId,
            user_id: 4, user_name: 'John', stock_id: 4,
            side: 'SELL', order_type: 'MARKET',
            quantity: 3, price: 0, stop_loss: 200, target: 800,
            status: 'OPEN'
        });
        const doc = await Order.findOne({ order_id: mktId });

        // Try to change price (should NOT change) and SL (should change)
        const result = await modifyOrder(doc._id.toString(), { price: 999, stopLoss: 180 });
        if (result.success) {
            const updated = await Order.findById(doc._id);
            const priceIgnored = updated.price !== 999;
            const slUpdated = updated.stop_loss === 180;
            if (priceIgnored && slUpdated) {
                pass(`Price NOT changed (MARKET protects it), SL correctly updated to 180`); passed++;
            } else {
                fail(`price=${updated.price} (should not be 999), SL=${updated.stop_loss} (should be 180)`); failed++;
            }
        } else { fail(result.message); failed++; }

        await cancelOrder(doc._id.toString());
    } catch (e) { fail(e.message); failed++; }
    console.log();

    // ─── SUMMARY ──────────────────────────────────────────────────────
    console.log("=========================================");
    console.log(`   RESULTS: ${passed} passed / ${failed} failed`);
    console.log("=========================================");

    await mongoose.connection.close();
    process.exit(0);
}

runTests().catch(err => {
    console.error("Fatal error:", err.message);
    process.exit(1);
});
