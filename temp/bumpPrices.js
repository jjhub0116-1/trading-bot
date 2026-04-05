require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Bumping stock prices manually...');
    // Arjun's AAPL Target is 170
    await Stock.updateOne({ stock_id: 101 }, { current_price: 180 });
    // Priya's MSFT Stop Loss is 300
    await Stock.updateOne({ stock_id: 103 }, { current_price: 290 });
    // Sneha's TSLA drops, she bought at 250, limit loss is $30, so any drop > $1/share on 50 shares
    await Stock.updateOne({ stock_id: 104 }, { current_price: 240 });

    console.log('Prices bumped!');
    process.exit(0);
});
