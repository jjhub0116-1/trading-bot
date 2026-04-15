/**
 * Script to create a new tester account on the Production Render URL
 */
const axios = require('axios');

const BASE_URL = 'https://trading-bot-e6e6.onrender.com';
const TEST_USER = {
    name: "Production Tester",
    email: "tester_" + Date.now() + "@trade.com",
    password: "testPassword123"
};

async function createTester() {
    try {
        console.log(`🚀 Sending registration request to ${BASE_URL}...`);
        
        const response = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
        
        if (response.data.success) {
            console.log("\n✅ User Created Successfully on Production!");
            console.log("-----------------------------------------");
            console.log(`Email:    ${TEST_USER.email}`);
            console.log(`Password: ${TEST_USER.password}`);
            console.log(`Token:    ${response.data.token}`);
            console.log("-----------------------------------------");
            console.log("Equity Shares Limit: 5,000");
            console.log("Commodity Lot Limit: 20");
        } else {
            console.error("❌ Registration Failed:", response.data);
        }
    } catch (error) {
        console.error("💥 API Error:", error.response ? error.response.data : error.message);
    }
}

createTester();
