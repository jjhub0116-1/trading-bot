const mongoose = require('mongoose');

const connectDB = async (options = { maxPoolSize: 50 }) => {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) throw new Error('MONGO_URI env var is required — do not hardcode credentials');
    try {
        await mongoose.connect(MONGO_URI, options);
        console.log(`✅ MongoDB Atlas Connected Successfully (Pool Size: ${options.maxPoolSize || 100})`);
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
