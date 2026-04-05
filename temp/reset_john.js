const mongoose = require('mongoose');
const { connect } = require('../config/db');
require('dotenv').config();

async function resetJohn() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('../models/User');
        const Portfolio = require('../models/Portfolio');
        const Order = require('../models/Order');

        // 1. Unflag
        await User.updateOne({ user_id: 4 }, { is_flagged: false });
        
        // 2. Wipe Portfolio
        await Portfolio.updateOne(
            { user_id: 4 },
            { 
                $set: { 
                    positions: [], 
                    realized_pnl: 0, 
                    unrealized_pnl: 0, 
                    overall_pnl: 0 
                } 
            }
        );

        // 3. Clear Orders
        await Order.deleteMany({ user_id: 4 });

        console.log("✅ John (User 4) has been completely reset to a clean state.");
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}
resetJohn();
