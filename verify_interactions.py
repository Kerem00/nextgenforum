import requests
import time
import sys
import random
import string

USERS_URL = "http://localhost:8001"
POSTS_URL = "http://localhost:8002"

def verify_interactions():
    print("Starting interaction verification flow...")
    
    # Generate random email to avoid conflicts
    rand_str = ''.join(random.choices(string.ascii_lowercase, k=5))
    email = f"interact_{rand_str}@example.com"
    password = "strongpassword"
    
    # 1. Register User
    print(f"\n1. Registering User ({email})...")
    user_data = {
        "email": email,
        "full_name": "Interaction Tester",
        "password": password
    }
    try:
        resp = requests.post(f"{USERS_URL}/users", json=user_data)
        if resp.status_code != 200:
            print(f"Failed to create user: {resp.text}")
            return
        user_id = resp.json()["id"]
        print(f"User created with ID: {user_id}")
    except Exception as e:
        print(f"Error connecting to Users Service: {e}")
        return

    # 2. Login
    print(f"\n2. Logging in...")
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
        print("Logged in successfully.")
    except Exception as e:
        print(f"Error connecting to Users Service login: {e}")
        return

    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Wait for potential propagation (though we are using same user ID, might not be needed if using direct DB check or assuming sync is fast/instant if same DB instances - wait, services use different DBs but User replica is in posts DB. )
    # But for creating post, we stick to owner_id from token.
    # The models.User in posts_service is populated via RabbitMQ.
    # So we MUST wait for the user to be replicated to Posts Service DB.
    print("Waiting 5 seconds for user replication to Posts Service...")
    time.sleep(5)

    # 3. Create Post
    print("\n3. Creating Post...")
    post_data = {"title": "Interaction Post", "content": "Testing comments and likes"}
    try:
        resp = requests.post(f"{POSTS_URL}/posts", json=post_data, headers=headers)
        if resp.status_code != 200:
            print(f"Failed to create post: {resp.text}")
            return
        post = resp.json()
        post_id = post["id"]
        print(f"Post created with ID: {post_id}")
    except Exception as e:
        print(f"Error connecting to Posts Service: {e}")
        return

    # 4. Create Comment
    print("\n4. Creating Comment...")
    comment_data = {"content": "This is a test comment"}
    try:
        resp = requests.post(f"{POSTS_URL}/posts/{post_id}/comments", json=comment_data, headers=headers)
        if resp.status_code != 200:
            print(f"Failed to create comment: {resp.text}")
            return
        comment = resp.json()
        comment_id = comment["id"]
        print(f"Comment created with ID: {comment_id}: {comment['content']}")
    except Exception as e:
        print(f"Error creating comment: {e}")
        return

    # 5. Get Comments
    print("\n5. Retrieving Comments...")
    try:
        resp = requests.get(f"{POSTS_URL}/posts/{post_id}/comments", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to get comments: {resp.text}")
            return
        comments = resp.json()
        print(f"Retrieved {len(comments)} comments.")
        assert len(comments) > 0
        assert comments[0]["content"] == "This is a test comment"
    except Exception as e:
        print(f"Error getting comments: {e}")
        return

    # 6. Like Post
    print("\n6. Liking Post...")
    try:
        resp = requests.post(f"{POSTS_URL}/posts/{post_id}/like", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to like post: {resp.text}")
            return
        print(f"Like response: {resp.json()}")
        assert resp.json()["message"] == "Post liked"
    except Exception as e:
        print(f"Error liking post: {e}")
        return

    # 7. Unlike Post
    print("\n7. Unliking Post (Toggle)...")
    try:
        resp = requests.post(f"{POSTS_URL}/posts/{post_id}/like", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to unlike post: {resp.text}")
            return
        print(f"Like response: {resp.json()}")
        assert resp.json()["message"] == "Post unliked"
    except Exception as e:
        print(f"Error unliking post: {e}")
        return

    # 8. Like Comment
    print("\n8. Liking Comment...")
    try:
        resp = requests.post(f"{POSTS_URL}/comments/{comment_id}/like", headers=headers)
        if resp.status_code != 200:
            print(f"Failed to like comment: {resp.text}")
            return
        print(f"Like response: {resp.json()}")
        assert resp.json()["message"] == "Comment liked"
    except Exception as e:
        print(f"Error liking comment: {e}")
        return

    print("\nAll verification steps passed!")

if __name__ == "__main__":
    verify_interactions()
