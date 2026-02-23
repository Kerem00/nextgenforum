from flask import Flask
import time

app = Flask(__name__)

@app.route("/")
def index():
    return {"message": "Hello from Flask!"}

if __name__ == "__main__":
    app.run(port=5000)
