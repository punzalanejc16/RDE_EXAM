from flask import request
from werkzeug.exceptions import BadRequest


def json_body():
    """Returns the request body as a dict, or raises 400 for anything else."""
    data = request.get_json(silent=True)
    if data is None and request.content_length:
        raise BadRequest('Request body must be valid JSON.')
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise BadRequest('Request body must be a JSON object.')
    return data


def text_field(data, name):
    value = data.get(name, '')
    return value if isinstance(value, str) else ''


def client_ip():
    # With TRUST_PROXY enabled, ProxyFix sets remote_addr from X-Forwarded-For
    return request.remote_addr or 'unknown'
