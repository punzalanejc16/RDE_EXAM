import React from 'react';

export default function ResultSummary({ result }) {
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
        <p><strong>Start Date & Time:</strong> {result.startTime}</p>
        <p><strong>Completion Date & Time:</strong> {result.timestamp}</p>
      </div>

      <div className="action-bar-flex">
        <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ width: 'auto' }}>
          Done / Back to Start
        </button>
      </div>

      <div className="assessment-locked">
        🔒 <strong>Assessment Locked:</strong> Multiple attempts are prohibited for this examination.
      </div>
    </div>
  );
}