import os
import logging
from dotenv import load_dotenv

# Explicit path papunta sa .env file sa root ng backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix
from services.config import env_bool, env_list
from services.json_store import StorageError
from services.exam_service import ExamDataError
from services.auth_service import admin_password_problem
from routes.admin_routes import admin_bp
from routes.exam_routes import exam_bp
from routes.auth_routes import auth_bp

FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend', 'dist'))
log = logging.getLogger('rde_exam')

app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024  # 64 KB is plenty for any request this API accepts
app.json.sort_keys = False

if env_bool('TRUST_PROXY'):
    # Only enable behind a reverse proxy (nginx, Caddy, etc.) so client IPs are correct
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

# Dev frontend origins; in production the frontend is served by this same server (no CORS needed)
CORS(app, origins=env_list('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'))

app.register_blueprint(auth_bp)
app.register_blueprint(exam_bp)
app.register_blueprint(admin_bp)


# ── Errors: always JSON for the API, never a debugger page ──

@app.errorhandler(HTTPException)
def handle_http_error(e):
    messages = {
        400: e.description if isinstance(e.description, str) else 'Bad request.',
        404: 'Not found.',
        405: 'Method not allowed.',
        413: 'Request is too large.',
        415: 'Request body must be JSON.',
    }
    return jsonify({"error": messages.get(e.code, e.name)}), e.code


@app.errorhandler(StorageError)
def handle_storage_error(e):
    log.error('Storage error: %s', e)
    return jsonify({"error": 'Data storage is temporarily unavailable. Please try again shortly.'}), 503


@app.errorhandler(ExamDataError)
def handle_exam_data_error(e):
    log.error('Exam data error: %s', e)
    return jsonify({"error": 'The examination is not available right now. Please contact the administrator.'}), 503


@app.errorhandler(Exception)
def handle_unexpected_error(e):
    log.exception('Unhandled error on %s %s', request.method, request.path)
    return jsonify({"error": 'Something went wrong on the server. Please try again.'}), 500


# ── Security headers ──

CSP = (
    "default-src 'self'; img-src 'self' data:; script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'no-referrer'
    if request.path.startswith('/api/') and not request.path.startswith('/api/images/'):
        response.headers['Cache-Control'] = 'no-store'
    if response.mimetype == 'text/html':
        response.headers['Content-Security-Policy'] = CSP
    if request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response


# ── Built frontend (npm run build) served from the same origin ──

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({"error": 'Not found.'}), 404
    if not os.path.isfile(os.path.join(FRONTEND_DIST, 'index.html')):
        return jsonify({"error": 'Frontend is not built. Run "npm run build" in the frontend folder.'}), 404
    if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, 'index.html')


problem = admin_password_problem()
if problem:
    log.warning('SECURITY WARNING: %s', problem)

if __name__ == '__main__':
    # Development only. For real use run: python serve.py
    app.run(debug=env_bool('FLASK_DEBUG'), port=int(os.getenv('PORT', '5000')))
