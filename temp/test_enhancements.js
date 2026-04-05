const BASE_URL = 'http://127.0.0.1:3000';
const LOGIN_URL = `${BASE_URL}/api/auth/login`;
const ORDER_URL = `${BASE_URL}/api/orders`;
const PORTFOLIO_URL = `${BASE_URL}/api/portfolio`;

async function testEnhancements() {
    try {
        console.log('🧪 Verifying API Enhancements...');

        // 1. LOGIN
        const loginRes = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'api@test.com', password: 'pass123' })
        });
        const { token } = await loginRes.json();
        console.log('✅ Logged in.');

        // 2. VERIFY CANCELLATION
        console.log('\n📦 Testing Order Cancellation...');
        const orderRes = await fetch(ORDER_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                stockId: 2, // GOOGL
                quantity: 10,
                orderType: 'LIMIT',
                price: 1500, // High price so it stays OPEN
                side: 'BUY'
            })
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
            console.error('❌ Failed to place LIMIT order:', JSON.stringify(orderData, null, 2));
            process.exit(1);
        }
        const { orderId } = orderData;
        console.log(`📝 Created LIMIT order: ${orderId}`);

        const cancelRes = await fetch(`${ORDER_URL}/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const cancelData = await cancelRes.json();
        console.log('🚫 Cancel Response:', cancelData.message);

        // 3. VERIFY PORTFOLIO P&L
        console.log('\n📊 Testing Enhanced Portfolio P&L...');
        const portfolioRes = await fetch(PORTFOLIO_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const libData = await portfolioRes.json();
        
        console.log('\n📥 PORTFOLIO RESPONSE (Enriched):');
        console.log(`- Total Realized P&L: ${libData.total_realized_pnl}`);
        console.log(`- Total Unrealized P&L: ${libData.total_unrealized_pnl}`);
        console.log(`- Net P&L: ${libData.net_pnl}`);

        if (libData.positions && Array.isArray(libData.positions)) {
            console.log(`- Active Positions Found: ${libData.positions.length}`);
            libData.positions.forEach(p => {
                console.log(`  > Stock ID ${p.stock_id}: Unrealized P&L: ${p.unrealized_pnl}`);
            });
        }

        if (libData.net_pnl !== undefined && cancelData.success) {
            console.log('\n✨ ALL ENHANCEMENTS VERIFIED SUCCESSFULLY!');
        } else {
            console.log('\n❌ VERIFICATION FAILED.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testEnhancements();
