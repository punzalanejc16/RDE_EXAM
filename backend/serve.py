"""
Production server: one process, many threads (required by the JSON file storage locks).

    python serve.py

Settings (backend/.env): HOST (default 0.0.0.0), PORT (default 5000), THREADS (default 16).
Put it behind HTTPS (a reverse proxy such as Caddy or nginx) before exposing it to the internet,
and set TRUST_PROXY=1 in that case.
"""
import os
import logging
from waitress import serve
from app import app

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '5000'))
    print(f'RDE Exam server running on http://{host}:{port}')
    serve(app, host=host, port=port, threads=int(os.getenv('THREADS', '16')), ident='')
