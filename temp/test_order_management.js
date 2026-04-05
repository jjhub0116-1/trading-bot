const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:3000/api';

async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function runTests() {
    console.log("=========================================");
    console.log("   🛠️ ORDER MANAGEMENT TEST SUITE");
    console.log("=========================================\n");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Order = require('../models/Order');

        // Reset: Cancel any existing open orders for John (user 4)
        await Order.deleteMany({ user_id: 4 });
        console.log("✅ Environment Reset: Old orders cleared.\n");

        // Auth
        console.log("🔑 Authenticating...");
        let authRes;
        try {
            authRes = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'john@test.com', password: 'hashed' })
            });
        } catch (e) {
            console.error("❌ Auth Fetch Failed:", e.message);
            throw e;
        }

        const authData = await authRes.json();
        const config = { 'Authorization': `Bearer ${authData.token}`, 'Content-Type': 'application/json' };
        console.log("✅ Authenticated as John.\n");

        // 1. PLACE LIMIT ORDER
        console.log("🛒 [STEP 1]: Placing LIMIT BUY order at $300");
        let orderRes;
        try {
            orderRes = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: config,
                body: JSON.stringify({
                    stockId: 4,
                    quantity: 10,
                    orderType: 'LIMIT',
                    price: 300,
                    side: 'BUY',
                    stopLoss: 250,
                    target: 400
                })
            });
        } catch (e) {
            console.error("❌ Place Order Fetch Failed:", e.message);
            throw e;
        }
        
        if (!orderRes.ok) {
            const errText = await orderRes.text();
            throw new Error(`Order placement failed: ${errText}`);
        }

        let orderData = await orderRes.json();
        const orderId = orderData.orderId;
        console.log(`✅ Order placed! ID: ${orderId}\n`);

        await delay(1000); // Wait for DB consistency

        // Need the MongoDB _id for the PUT routes
        const orderDoc = await Order.findOne({ order_id: orderId });
        if (!orderDoc) throw new Error("Order not found in DB after placement.");
        const mongoId = orderDoc._id.toString();

        // 2. MODIFY ORDER
        console.log(`✏️ [STEP 2]: Modifying order ${orderId} (Price $300 -> $320, SL $250 -> $280)`);
        let modifyRes;
        try {
            modifyRes = await fetch(`${API_BASE}/orders/${mongoId}/modify`, {
                method: 'PUT',
                headers: config,
                body: JSON.stringify({
                    price: 320,
                    stopLoss: 280
                })
            });
        } catch (e) {
            console.error("❌ Modify Fetch Failed:", e.message);
            throw e;
        }

        let modifyData = await modifyRes.json();
        
        if (modifyData.success) {
            console.log("✅ Modify API returned success.");
            const updatedDoc = await Order.findById(mongoId);
            console.log(`   New Price: ${updatedDoc.price} (Expected 320)`);
            console.log(`   New Stop Loss: ${updatedDoc.stop_loss} (Expected 280)`);
            if (updatedDoc.price === 320 && updatedDoc.stop_loss === 280) {
                console.log("   ✨ ASSERTION PASSED: Modification persisted correctly.\n");
            } else {
                console.error("   ❌ ASSERTION FAILED: Modification data mismatch.\n");
            }
        } else {
            console.error("❌ Modify API failed:", modifyData.message);
        }

        // 3. CANCEL ORDER
        console.log(`🚫 [STEP 3]: Cancelling order ${orderId}`);
        let cancelRes;
        try {
            cancelRes = await fetch(`${API_BASE}/orders/${mongoId}/cancel`, {
                method: 'PUT',
                headers: config
            });
        } catch (e) {
            console.error("❌ Cancel Fetch Failed:", e.message);
            throw e;
        }

        let cancelData = await cancelRes.json();

        if (cancelData.success) {
            console.log("✅ Cancel API returned success.");
            const cancelledDoc = await Order.findById(mongoId);
            console.log(`   Final Status: ${cancelledDoc.status} (Expected CANCELLED)`);
            if (cancelledDoc.status === 'CANCELLED') {
                console.log("   ✨ ASSERTION PASSED: Order successfully defunct.\n");
            } else {
                console.error("   ❌ ASSERTION FAILED: Status is not CANCELLED.\n");
            }
        } else {
            console.error("❌ Cancel API failed:", cancelData.message);
        }

    } catch (err) {
        console.error("Test execution failed:", err.message);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

runTests();
