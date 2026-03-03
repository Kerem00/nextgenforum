import requests
import time
import sys
import random
import string

USERS_URL = "http://localhost:8001"
POSTS_URL = "http://localhost:8002"

def test_flow():
    print("Starting verification flow...")
    
    # Generate random email
    rand_str = ''.join(random.choices(string.ascii_lowercase, k=5))
    email = f"test_{rand_str}@example.com"
    password = "strongpassword"
    
    # 1. Register User
    print(f"\n1. Registering User in Users Service ({email})...")
    user_data = {
        "email": email,
        "username": f"user_{rand_str}",
        "full_name": "Test User",
        "password": password
    }
    try:
        resp = requests.post(f"{USERS_URL}/users", json=user_data)
        if resp.status_code != 200:
            print(f"Failed to create user: {resp.text}")
            return
        user = resp.json()
        print(f"User created: {user}")
    except Exception as e:
        print(f"Error connecting to Users Service: {e}")
        return

    user_id = user["id"]
    
    # 2. Login
    print(f"\n2. Logging in to get JWT token...")
    login_data = {
        "username": email,
        "password": password
    }
    try:
        resp = requests.post(f"{USERS_URL}/login", data=login_data)
        if resp.status_code != 200:
            print(f"Failed to login: {resp.text}")
            return
        token_data = resp.json()
        access_token = token_data["access_token"]
        print(f"Got access token: {access_token[:20]}...")
    except Exception as e:
        print(f"Error connecting to Users Service login: {e}")
        return

    # Wait for propagation (RabbitMQ)
    print("Waiting 2 seconds for event propagation...")
    time.sleep(2)
    
    # 3. Create Post (Success)
    print("\n3. Creating Post for User (with token)...")
    headers = {"Authorization": f"Bearer {access_token}"}
    post_data = {"title": "My First Post", "content": "Hello World"}
    
    try:
        resp = requests.post(f"{POSTS_URL}/posts", json=post_data, headers=headers)
        if resp.status_code == 200:
            print(f"Post created successfully: {resp.json()}")
            assert resp.json()["owner_id"] == user_id
            print("Post owner_id matches user_id.")
        else:
            print(f"Failed to create post: {resp.text}")
    except Exception as e:
        print(f"Error connecting to Posts Service: {e}")

    # 4. Create Post (Fail)
    print("\n4. Creating Post without token (should fail)...")
    try:
        resp = requests.post(f"{POSTS_URL}/posts", json=post_data)
        if resp.status_code == 401:
            print("Success: Unauthorized request blocked (401).")
        else:
            print(f"Failure: Expected 401, got {resp.status_code}")
    except Exception as e:
        print(f"Error connecting to Posts Service: {e}")

if __name__ == "__main__":
    test_flow()
