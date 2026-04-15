/**
 * Check and purge stale OPEN orders from test accounts
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Stock = require('../models/Stock');

async function checkStaleOrders() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const openOrders = await Order.find({ status: 'OPEN' }).lean();
    console.log(`Total OPEN orders across all users: ${openOrders.length}`);
    
    const stocks = await Stock.find({}).lean();
    const sm = {};
    stocks.forEach(s => sm[s.stock_id] = s);
    
    openOrders.forEach(o => {
        const s = sm[o.stock_id];
        console.log(`User ${o.user_id}: ${o.side} ${o.quantity} ${s?.symbol || o.stock_id} (${s?.asset_type || '?'}) - qty=${o.quantity}, lots=${s?.asset_type === 'COMMODITY' ? o.quantity : 0}`);
    });
    
    process.exit(0);
}

checkStaleOrders().catch(console.error);
