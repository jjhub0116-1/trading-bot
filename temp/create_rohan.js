const API_BASE = 'http://127.0.0.1:3000/api';

async function createRohan() {
    console.log("🚀 Creating user Rohan via API...");
    
    const newUser = {
        name: "Rohan",
        email: "rohan@test.com",
        password: "hashed"
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
            console.log("✅ User 'Rohan' created successfully!");
            console.log("ID:", data.user.id);
            console.log("Email:", data.user.email);
        } else {
            console.error("❌ Failed to create Rohan:", data.message || data.error);
        }
    } catch (error) {
        console.error("❌ Connection error:", error.message);
    }
}

createRohan();
