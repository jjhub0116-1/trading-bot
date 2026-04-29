require('dotenv').config();

async function testOrder() {
    const loginRes = await fetch('https://trading-bot-e6e6.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test_official_1776261449071@trade.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login:', loginData.message);

    const stocksRes = await fetch('https://trading-bot-e6e6.onrender.com/api/stocks');
    const stocks = await stocksRes.json();
    const aapl = stocks.find(s => s.symbol === 'AAPL');
    const gold = stocks.find(s => s.symbol === 'GC=F');
    console.log('AAPL:', aapl ? `id=${aapl.stock_id} price=${aapl.current_price}` : 'NOT FOUND');
    console.log('Gold:', gold ? `id=${gold.stock_id} lot_size=${gold.lot_size}` : 'NOT FOUND');

    console.log('\n>> Placing 2 AAPL shares:');
    const r1 = await fetch('https://trading-bot-e6e6.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ stockId: aapl.stock_id, quantity: 2, orderType: 'MARKET', price: 0, side: 'BUY' })
    });
    const d1 = await r1.json();
    console.log('  HTTP Status:', r1.status);
    console.log('  Response:', JSON.stringify(d1));

    console.log('\n>> Placing 1 Gold lot:');
    const r2 = await fetch('https://trading-bot-e6e6.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ stockId: gold.stock_id, quantity: 1, orderType: 'MARKET', price: 0, side: 'BUY' })
    });
    const d2 = await r2.json();
    console.log('  HTTP Status:', r2.status);
    console.log('  Response:', JSON.stringify(d2));
}

testOrder().catch(console.error);
