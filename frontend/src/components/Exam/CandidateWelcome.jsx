import React from 'react';
import { ClipboardCheck, ListChecks, RotateCcw } from 'lucide-react';

export default function CandidateWelcome({ user, questionCount, questionsLoading, starting, onStart, onRetry, error }) {
  const attemptCount = user.attemptCount || 0;
  const last = user.lastAttempt;
  const isRetake = attemptCount > 0;
  const unavailable = !questionsLoading && questionCount === 0;

  return (
    <div className="card compact-card">
      <div className="card-header">
        <div className="welcome-icon">
          {isRetake ? <RotateCcw size={28} aria-hidden="true" /> : <ClipboardCheck size={28} aria-hidden="true" />}
        </div>
        <h2>{isRetake ? `Welcome back, ${user.fullName}` : `Welcome, ${user.fullName}`}</h2>
        <p className="greeting">
          {isRetake
            ? 'You can take the examination again whenever you are ready.'
            : 'Your account is verified. Good luck on your examination!'}
        </p>
      </div>

      {last && (
        <div className="last-attempt">
          <div>
            <span className="last-attempt-label">Previous Attempt</span>
            <span className="last-attempt-score">
              {last.score} / {last.total} <span>({last.percentage}%)</span>
            </span>
            <span className="last-attempt-time">{last.timestamp}</span>
          </div>
          <div className="last-attempt-side">
            <span className={`admin-status ${last.status === 'PASSED' ? 'passed' : 'failed'}`}>{last.status}</span>
            <span className="last-attempt-time">
              {attemptCount} attempt{attemptCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <ul className="welcome-checklist">
        <li>
          <ListChecks size={16} aria-hidden="true" />
          {questionsLoading ? 'Loading assessment items...' : questionCount > 0 ? `${questionCount} identification items` : 'Assessment items unavailable'}
        </li>
        <li><ListChecks size={16} aria-hidden="true" /> Answer each item before moving to the next</li>
        <li><ListChecks size={16} aria-hidden="true" /> Your progress is saved if the page reloads</li>
      </ul>

      {unavailable ? (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={onStart} disabled={questionsLoading || starting}>
          {starting ? 'Preparing Examination...' : isRetake ? 'Retake Examination' : 'Start Examination'}
        </button>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}
