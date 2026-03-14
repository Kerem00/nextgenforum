import requests

try:
    res = requests.post("http://localhost:8001/login", data={"username": "admin", "password": "admin"}, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=5)
    print("Status Code:", res.status_code)
    print("Response JSON:", res.text)
except Exception as e:
    print("Error:", e)
