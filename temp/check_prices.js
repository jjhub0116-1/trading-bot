require('dotenv').config();

async function checkPrices() {
    const res = await fetch('https://trading-bot-e6e6.onrender.com/api/stocks');
    const stocks = await res.json();
    console.log("Production Stock Prices:");
    stocks.forEach(s => {
        const price = s.current_price || s.price;
        console.log(`  ${s.symbol}: $${price}`);
    });
}

checkPrices().catch(console.error);
