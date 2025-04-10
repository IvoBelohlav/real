import requests
import json

def test_webhook():
    user_id = 'd7d637de-3678-4519-9573-d70537027c04'  # User ID from logs
    url = 'http://localhost:8000/api/subscriptions/test-webhook'
    
    try:
        response = requests.post(
            url,
            json={'user_id': user_id}
        )
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_webhook() 