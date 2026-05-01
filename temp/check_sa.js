require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

async function checkSuperAdmin() {
    await connectDB();
    const sa = await User.findOne({ email: 'superadmin@propfirm.com' });
    console.log("Superadmin lot pool:", sa.commodity_equity);
    process.exit(0);
}
checkSuperAdmin();
