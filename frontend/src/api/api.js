export const API_BASE_URL = 'http://127.0.0.1:5000';

export async function fetchQuestionsApi() {
  const res = await fetch(`${API_BASE_URL}/api/questions`);
  if (!res.ok) throw new Error('Failed to load assessment items from the backend server.');
  return res.json();
}

export async function checkCandidateNameApi(trimmedName) {
  const res = await fetch(`${API_BASE_URL}/api/check-name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentName: trimmedName })
  });
  return res.json();
}

export async function submitExamApi(payload) {
  const res = await fetch(`${API_BASE_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function adminLoginApi(passphrase) {
  const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase })
  });
  return res.json();
}

export async function fetchAdminResultsApi() {
  const res = await fetch(`${API_BASE_URL}/api/results`);
  if (!res.ok) throw new Error('Failed to fetch results.');
  return res.json();
}