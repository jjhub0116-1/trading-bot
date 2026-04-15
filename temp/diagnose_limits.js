/**
 * Diagnostics: Check all users' actual exposure vs limits
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Portfolio = require('../models/Portfolio');
const Stock = require('../models/Stock');

async function diagnose() {
    await mongoose.connect(process.env.MONGO_URI);
    const allUsers = await User.find({}).lean();
    
    for (const u of allUsers) {
        const openOrders = await Order.find({ user_id: u.user_id, status: 'OPEN' }).lean();
        const port = await Portfolio.findOne({ user_id: u.user_id }).lean();
        
        if (openOrders.length === 0 && (!port || port.positions.length === 0)) continue;
        
        const stockIds = [...new Set([
            ...openOrders.map(o => o.stock_id), 
            ...(port?.positions.map(p => p.stock_id) || [])
        ])];
        
        const stocks = await Stock.find({ stock_id: { $in: stockIds } }).lean();
        const sm = {};
        stocks.forEach(s => sm[s.stock_id] = s);
        
        let lots = 0, units = 0;
        openOrders.forEach(o => {
            const s = sm[o.stock_id];
            lots += (s?.asset_type === 'COMMODITY') ? o.quantity : 0;
            units += o.quantity * (s?.lot_size || 1);
        });
        port?.positions.forEach(p => {
            const s = sm[p.stock_id];
            lots += (s?.asset_type === 'COMMODITY') ? Math.abs(p.net_quantity) : 0;
            units += Math.abs(p.net_quantity) * (s?.lot_size || 1);
        });
        
        const lotOk = lots <= (u.commodity_equity || 20);
        const unitOk = units <= (u.equity || 5000);
        
        console.log(`User ${u.user_id} (${u.user_name}):`);
        console.log(`  Units: ${units} / ${u.equity} ${unitOk ? '✅' : '❌ OVER LIMIT'}`);
        console.log(`  Lots:  ${lots} / ${u.commodity_equity || 20} ${lotOk ? '✅' : '❌ OVER LIMIT'}`);
    }
    
    process.exit(0);
}

diagnose().catch(console.error);
