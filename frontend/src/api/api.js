// Empty = same origin (production build served by the backend, or the Vite dev proxy).
// Set VITE_API_BASE_URL only if the API lives on a different host.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const TOKEN_STORAGE_KEY = 'rde_exam_token';
const DEFAULT_TIMEOUT_MS = 15000;

export const assetUrl = (path) => (path ? `${API_BASE_URL}${path}` : null);

export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

async function request(path, { method = 'GET', body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getStoredToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? 'The server is taking too long to respond. Please check your connection and try again.'
        : 'Cannot connect to the server. Please check your connection and try again.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || `Something went wrong (error ${res.status}). Please try again.`, res.status, data);
  }
  return data;
}

// ── Auth ──
export const registerApi = (payload) =>
  request('/api/auth/register', { method: 'POST', body: payload, auth: false });

export const loginApi = (username, password) =>
  request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });

export const fetchMeApi = () => request('/api/auth/me');

export const forgotPasswordApi = (identifier) =>
  request('/api/auth/forgot-password', { method: 'POST', body: { identifier }, auth: false });

export const resetPasswordApi = (payload) =>
  request('/api/auth/reset-password', { method: 'POST', body: payload, auth: false });

export const logoutApi = () => request('/api/auth/logout', { method: 'POST', body: {}, timeoutMs: 5000 });

// ── Exam ──
export const fetchQuestionsApi = () => request('/api/questions');

export const startExamApi = () => request('/api/exam/start', { method: 'POST', body: {} });

export const submitExamApi = (payload) =>
  request('/api/submit', { method: 'POST', body: payload, timeoutMs: 30000 });

// ── Admin ──
export const fetchAdminResultsApi = () => request('/api/admin/results');

export const fetchResultDetailApi = (resultId) => request(`/api/admin/results/${resultId}`);

export const deleteResultApi = (resultId) =>
  request(`/api/admin/results/${resultId}`, { method: 'DELETE' });

export const fetchUsersApi = () => request('/api/admin/users');

export const fetchPasswordResetsApi = () => request('/api/admin/password-resets');

export const approvePasswordResetApi = (requestId) =>
  request(`/api/admin/password-resets/${requestId}/approve`, { method: 'POST' });

export const denyPasswordResetApi = (requestId) =>
  request(`/api/admin/password-resets/${requestId}/deny`, { method: 'POST' });

export const approveUserApi = (userId) =>
  request(`/api/admin/users/${userId}/approve`, { method: 'POST' });

export const rejectUserApi = (userId) =>
  request(`/api/admin/users/${userId}/reject`, { method: 'POST' });

export const deleteUserApi = (userId) =>
  request(`/api/admin/users/${userId}`, { method: 'DELETE' });
