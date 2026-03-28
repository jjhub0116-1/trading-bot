const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://innovisiontechai_db_user:innovision@cluster0.rrcqffl.mongodb.net/?appName=Cluster0";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Atlas Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
