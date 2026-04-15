require('dotenv').config();

async function checkWallet() {
    const loginRes = await fetch('https://trading-bot-e6e6.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test_official_1776261449071@trade.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const walletRes = await fetch('https://trading-bot-e6e6.onrender.com/api/wallet', {
        headers: { Authorization: 'Bearer ' + token }
    });
    const wallet = await walletRes.json();
    console.log("WALLET:", JSON.stringify(wallet, null, 2));

    const portfolioRes = await fetch('https://trading-bot-e6e6.onrender.com/api/portfolio', {
        headers: { Authorization: 'Bearer ' + token }
    });
    const portfolio = await portfolioRes.json();
    console.log("PORTFOLIO:", JSON.stringify(portfolio, null, 2));
}

checkWallet().catch(console.error);
