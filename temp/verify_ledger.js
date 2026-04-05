const BASE_URL = 'http://127.0.0.1:3000';
const LOGIN_URL = `${BASE_URL}/api/auth/login`;
const ORDER_URL = `${BASE_URL}/api/orders`;
const TXN_URL = `${BASE_URL}/api/wallet/transactions`;

async function verifyLedger() {
    try {
        console.log('🧪 Verifying Transaction Ledger Enhancement...');

        // 1. LOGIN
        const loginRes = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'api@test.com', password: 'pass123' })
        });
        const { token } = await loginRes.json();
        console.log('✅ Logged in.');

        // 2. PLACE ORDER
        console.log('📦 Placing order...');
        await fetch(ORDER_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                stockId: 1,
                quantity: 5,
                orderType: 'MARKET',
                price: 0,
                side: 'BUY'
            })
        });

        // Wait for execution
        console.log('⏳ Waiting for trade execution...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. CHECK TRANSACTIONS
        const txnRes = await fetch(TXN_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const txns = await txnRes.json();
        
        console.log('\n📥 LATEST TRANSACTION (with quantity):');
        console.log(JSON.stringify(txns[0], null, 2));

        if (txns[0] && txns[0].quantity === 5) {
            console.log('\n✨ SUCCESS: Quantity found in ledger!');
        } else {
            console.log('\n❌ FAILURE: Quantity missing or incorrect.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyLedger();
