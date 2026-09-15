// Keeps an in-progress exam on this device so a refresh or dropped connection doesn't lose answers.
const key = (userId) => `rde_exam_progress_${userId}`;

export function loadExamProgress(userId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key(userId)) || 'null');
    if (saved && typeof saved.attemptTicket === 'string' && Array.isArray(saved.order)) return saved;
  } catch {
    /* unreadable or unavailable */
  }
  return null;
}

export function saveExamProgress(userId, progress) {
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(progress));
  } catch {
    /* localStorage unavailable */
  }
}

export function clearExamProgress(userId) {
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    /* localStorage unavailable */
  }
}
