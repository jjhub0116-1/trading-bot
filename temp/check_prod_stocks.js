/**
 * Check production API for commodity stock details
 */
require('dotenv').config();

async function checkProduction() {
    const res = await fetch('https://trading-bot-e6e6.onrender.com/api/stocks');
    const stocks = await res.json();

    console.log("All stocks from production API:");
    stocks.forEach(s => {
        console.log(`  ID:${s.stock_id} | ${s.symbol} | type:${s.asset_type} | lot_size:${s.lot_size}`);
    });

    console.log("\nCommodities only:");
    const commodities = stocks.filter(s => s.asset_type === 'COMMODITY');
    if (commodities.length === 0) {
        console.log("  ❌ NO COMMODITIES FOUND ON PRODUCTION!");
    } else {
        commodities.forEach(c => console.log(`  ✅ ${c.symbol} | lot_size:${c.lot_size}`));
    }
}

checkProduction().catch(console.error);
