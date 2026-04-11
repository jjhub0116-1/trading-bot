/**
 * Concurrent Trade Placement Test for 100 Users
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { placeOrder } = require('../modules/order');
const { processAllOpenOrders } = require('../modules/tradeEngine');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Order = require('../models/Order');

async function run() {
    await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 150 });
    console.log("Connected to DB.");

    // Clean up past test data (just orders to be safe)
    await Order.deleteMany({ order_id: /TESTCONC/ });

    // Ensure we have users 1 to 100
    // Actually, instead of real users via the db, let's just directly call the placeOrder 
    // Wait, placeOrder requires the user to exist in DB. 
    // I will mock this by using the internal executeTrade directly, or placing orders for User 4 but different stocks?
    // No, 100 users trading simultaneously. Let's create 100 mock users.
    
    console.log("Seeding 100 mock users...");
    const userIds = Array.from({ length: 100 }, (_, i) => 1000 + i);
    const mockUsers = userIds.map(uid => ({
        user_id: uid, user_name: `Trader_${uid}`, email: ` trader${uid}@test.com`, password: 'mock', equity: 10000 
    }));
    await User.bulkWrite(mockUsers.map(u => ({
        updateOne: { filter: { user_id: u.user_id }, update: { $set: u }, upsert: true }
    })));

    const mockPortfolios = userIds.map(uid => ({
        user_id: uid, user_name: `Trader_${uid}`, positions: []
    }));
    await Portfolio.bulkWrite(mockPortfolios.map(p => ({
        updateOne: { filter: { user_id: p.user_id }, update: { $set: p }, upsert: true }
    })));

    console.log("Placing 100 concurrent market orders...");
    const orderPromises = [];
    const startTime = Date.now();
    for (const uid of userIds) {
        orderPromises.push(placeOrder(uid, 4, 1, 'MARKET', 0, null, null, 'BUY')); 
    }

    const placeResults = await Promise.allSettled(orderPromises);
    const placeErrors = placeResults.filter(r => r.status === 'rejected');
    console.log(`Placed 100 orders in ${Date.now() - startTime}ms. Errors: ${placeErrors.length}`);

    console.log("Triggering engine tick to execute 100 orders concurrently...");
    const engineStart = Date.now();
    
    // Will update 100 orders -> executeTrade -> uses 100 concurrent Mongo transactions
    await processAllOpenOrders();
    
    console.log(`Engine processed 100 trades in ${Date.now() - engineStart}ms.`);

    // Verification
    const executedCount = await Order.countDocuments({ user_id: { $in: userIds }, status: 'EXECUTED' });
    console.log(`Verified Executed Orders in DB: ${executedCount} / 100`);

    // Cleanup
    await User.deleteMany({ user_id: { $in: userIds } });
    await Portfolio.deleteMany({ user_id: { $in: userIds } });
    await Order.deleteMany({ user_id: { $in: userIds } });

    await mongoose.connection.close();
    process.exit(0);
}

run().catch(console.error);
