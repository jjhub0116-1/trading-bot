const YF = require('yahoo-finance2').default;
const yahooFinance = new YF({ suppressNotices: ['yahooSurvey'] });
const Stock = require('../models/Stock');

const POLL_INTERVAL_MS = 5000; // Every 5 seconds

/**
 * Fetches live prices for all symbols concurrently from Yahoo Finance,
 * then bulk-updates the MongoDB stocks collection.
 */
async function fetchAndUpdatePrices() {
    try {
        // Get all stocks from DB to know which symbols to fetch
        const stocks = await Stock.find({}, { symbol: 1, stock_id: 1 }).lean();
        if (stocks.length === 0) return;

        const symbols = stocks.map(s => s.symbol);

        // Fetch all metrics concurrently
        const results = await Promise.allSettled(
            symbols.map(sym =>
                yahooFinance.quote(sym, { fields: ['regularMarketPrice', 'fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'regularMarketDayHigh', 'regularMarketDayLow'] })
                    .then(q => ({ 
                        symbol: sym, 
                        price: q.regularMarketPrice,
                        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
                        fiftyTwoWeekLow: q.fiftyTwoWeekLow,
                        dayHigh: q.regularMarketDayHigh,
                        dayLow: q.regularMarketDayLow
                    }))
                    .catch(() => ({ symbol: sym, price: null }))
            )
        );

        // Bulk update MongoDB
        const updateOps = results
            .filter(r => r.status === 'fulfilled' && r.value.price != null)
            .map(r => ({
                updateOne: {
                    filter: { symbol: r.value.symbol },
                    update: { 
                        $set: { 
                            current_price: r.value.price,
                            fiftyTwoWeekHigh: r.value.fiftyTwoWeekHigh,
                            fiftyTwoWeekLow: r.value.fiftyTwoWeekLow,
                            dayHigh: r.value.dayHigh,
                            dayLow: r.value.dayLow
                        } 
                    }
                }
            }));

        if (updateOps.length > 0) {
            await Stock.bulkWrite(updateOps, { ordered: false });
            console.log(`📈 [PriceFetcher] Updated ${updateOps.length}/${symbols.length} stocks. ${new Date().toLocaleTimeString()}`);
        }

    } catch (err) {
        // Non-fatal — don't crash the bot if Yahoo Finance is temporarily down
        console.error('⚠️ [PriceFetcher] Price update failed:', err.message);
    }
}

/**
 * Starts the background price polling loop.
 * Call this once at bot startup after DB is connected.
 */
function startPriceFetcher() {
    console.log(`🌐 [PriceFetcher] Live price polling started (every ${POLL_INTERVAL_MS / 1000}s via Yahoo Finance)`);
    // Run once immediately on startup so prices are fresh before first tick
    fetchAndUpdatePrices();
    // Then poll on interval
    return setInterval(fetchAndUpdatePrices, POLL_INTERVAL_MS);
}

module.exports = { startPriceFetcher };
