const YF = require('yahoo-finance2').default;
const yahooFinance = new YF({ suppressNotices: ['yahooSurvey'] });

async function check() {
    try {
        // Fetch quote for AAPL
        const quote = await yahooFinance.quote('AAPL');
        
        // Print all available keys related to highs, lows, and averages
        const keys = Object.keys(quote).filter(k => 
            k.toLowerCase().includes('high') || 
            k.toLowerCase().includes('low') || 
            k.toLowerCase().includes('avg') || 
            k.toLowerCase().includes('average')
        );
        
        const metrics = {};
        keys.forEach(k => metrics[k] = quote[k]);
        
        console.log('--- AVAILABLE METRICS (AAPL) ---');
        console.log(JSON.stringify(metrics, null, 2));
        
    } catch (e) {
        console.error('API Error:', e.message);
    }
    process.exit(0);
}
check();
