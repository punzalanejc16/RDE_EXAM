import os
from dotenv import load_dotenv

# Explicit path papunta sa .env file sa root ng backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

from flask import Flask
from flask_cors import CORS
from routes.admin_routes import admin_bp
from routes.exam_routes import exam_bp

app = Flask(__name__, static_folder='static')
CORS(app)

app.register_blueprint(exam_bp)
app.register_blueprint(admin_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)