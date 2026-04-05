const mongoose = require('mongoose');
const { connect } = require('../config/db');
require('dotenv').config();

async function unflag() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('../models/User');
        await User.updateOne({ user_id: 4 }, { is_flagged: false });
        console.log("Successfully set user_id 4 is_flagged = false.");
    } catch(err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}
unflag();
