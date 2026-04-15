require('dotenv').config();

async function testOrder() {
    // Login
    const loginRes = await fetch('https://trading-bot-e6e6.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test_official_1776261449071@trade.com', password: 'password123' })
    });
    const { token } = await loginRes.json();

    // Get stocks to find Gold
    const stocksRes = await fetch('https://trading-bot-e6e6.onrender.com/api/stocks');
    const stocks = await stocksRes.json();
    const gold = stocks.find(s => s.symbol === 'GC=F');
    console.log('Gold Stock ID:', gold?.stock_id, '| Lot Size:', gold?.lot_size, '| Asset Type:', gold?.asset_type);

    // Try to place 1 lot of Gold
    const orderRes = await fetch('https://trading-bot-e6e6.onrender.com/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ stockId: gold.stock_id, quantity: 1, orderType: 'MARKET', price: 0, side: 'BUY' })
    });
    const orderData = await orderRes.json();
    console.log('Order result:', JSON.stringify(orderData));
}

testOrder().catch(console.error);
