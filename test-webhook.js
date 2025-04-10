// Simple script to test the webhook endpoint
const fetch = require('node-fetch');

async function testWebhook() {
  const userId = 'd7d637de-3678-4519-9573-d70537027c04'; // User ID from logs
  
  try {
    const response = await fetch('http://localhost:8000/api/subscriptions/test-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook(); 