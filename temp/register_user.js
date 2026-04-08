const API_BASE = 'http://127.0.0.1:3000/api';

async function registerNewUser() {
    console.log("🚀 Attempting to create a new user via API...");
    
    const newUser = {
        name: "Test User " + Math.floor(Math.random() * 1000),
        email: "testuser" + Date.now() + "@example.com",
        password: "securePassword123"
    };

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newUser)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log("✅ User created successfully!");
            console.log("User details:", data.user);
            console.log("Token received:", data.token.substring(0, 20) + "...");
        } else {
            console.error("❌ Failed to create user:", data.message || data.error);
        }
    } catch (error) {
        console.error("❌ Connection error:", error.message);
    }
}

registerNewUser();
