import React from 'react';
import { formatDuration } from '../../utils/helpers';

export default function ResultSummary({ result, onBackToDashboard, onRetake, retaking }) {
  return (
    <div className="card">
      <h2>Assessment Summary</h2>
      {result.status === 'PASSED' ? (
        <div className="congrats-banner" role="status">
          🎉 You Did Great! Congratulations! 🎉
        </div>
      ) : (
        <div className="encourage-banner" role="status">
          😞 Better luck next time! Don't be discouraged—keep studying, review your technical concepts, and try your best next time! 📚✏️
        </div>
      )}
      <div className={`result-banner ${result.status === 'PASSED' ? 'pass' : 'fail'} ${result.status === 'FAILED' ? 'fail-animate' : ''}`}>
        <h3>Status: {result.status}</h3>
        <p className="result-score">
          Score: {result.score} / {result.total} ({result.percentage}%)
        </p>
      </div>
      <div className="result-details">
        <p><strong>Candidate Name:</strong> {result.studentName}</p>
        {result.attemptNumber && <p><strong>Attempt:</strong> #{result.attemptNumber}</p>}
        <p><strong>Start Date & Time:</strong> {result.startTime}</p>
        <p><strong>Completion Date & Time:</strong> {result.timestamp}</p>
        {result.durationSeconds != null && <p><strong>Duration:</strong> {formatDuration(result.durationSeconds)}</p>}
      </div>

      <div className="action-bar-flex">
        <button onClick={onBackToDashboard} className="btn btn-secondary" style={{ width: 'auto' }} disabled={retaking}>
          Back to Dashboard
        </button>
        <button onClick={onRetake} className="btn btn-primary" style={{ width: 'auto' }} disabled={retaking}>
          {retaking ? 'Preparing...' : 'Retake Examination'}
        </button>
      </div>
    </div>
  );
}