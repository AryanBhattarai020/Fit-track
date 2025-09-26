// Simple test user creation script
const API_BASE_URL = 'http://localhost:3001';

async function createTestUser() {
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'admin@finetrack.com',
        password: 'Admin123!'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testUser)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Test user created successfully!');
            console.log('Email:', testUser.email);
            console.log('Password:', testUser.password);
            console.log('Response:', data);
        } else {
            console.log('❌ Failed to create test user:', data);
        }
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
    }
}

// Run the function
createTestUser();