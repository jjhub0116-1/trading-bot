const BASE_URL = 'https://trading-bot-e6e6.onrender.com/api';

async function testRenderAPI() {
    console.log("=== Testing Admin Creation on Render API ===");
    
    // 1. Log in as Superadmin to get JWT
    console.log("\n1. Logging in as Super Admin (superadmin@propfirm.com)...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'superadmin@propfirm.com',
            password: 'password123'
        })
    });
    
    if (loginRes.status !== 200) {
        console.error("❌ Failed to log in as Superadmin on Render. Is Render updated? Error:", await loginRes.text());
        return;
    }
    const loginData = await loginRes.json();
    const superAdminToken = loginData.token;
    console.log("✅ Logged in successfully. Received JWT Token.");

    // 2. Superadmin creates a new Admin via the API
    console.log("\n2. Super Admin creating a NEW Admin via Render API...");
    const createAdminRes = await fetch(`${BASE_URL}/admin/create-admin`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${superAdminToken}`
        },
        body: JSON.stringify({
            user_name: "Render Test Admin 2",
            email: "renderadmin2@propfirm.com",
            password: "password123",
            lot_limit: 50000,
            loss_limit: 5000
        })
    });

    if (createAdminRes.status === 201 || createAdminRes.status === 200) {
        const newAdmin = await createAdminRes.json();
        console.log("✅ Admin successfully created via the Render API!");
        console.log(newAdmin);
    } else {
        console.error("❌ Failed to create Admin via API. Error:", await createAdminRes.text());
    }
}

testRenderAPI().catch(console.error);
