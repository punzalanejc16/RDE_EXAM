import React from 'react';

export default function ReviewModal({ reviewCandidate, setReviewCandidate, API_BASE_URL }) {
  if (!reviewCandidate) return null;

  return (
    <div className="review-modal-overlay" onClick={() => setReviewCandidate(null)}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h3>Candidate Exam Review</h3>
          <button
            type="button"
            className="review-modal-close"
            onClick={() => setReviewCandidate(null)}
            aria-label="Close review"
          >
            &times;
          </button>
        </div>

        <div className="review-candidate-info">
          <p><strong>Full Name:</strong> {reviewCandidate.studentName}</p>
          <p><strong>Score:</strong> {reviewCandidate.score} / {reviewCandidate.total}</p>
          <p><strong>Percentage:</strong> {reviewCandidate.percentage}%</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`admin-status ${reviewCandidate.status === 'PASSED' ? 'passed' : 'failed'}`}>
              {reviewCandidate.status}
            </span>
          </p>
          <p><strong>Completion Time:</strong> {reviewCandidate.timestamp}</p>
        </div>

        <div className="review-breakdown">
          {Array.isArray(reviewCandidate.detailedBreakdown) && reviewCandidate.detailedBreakdown.length > 0 ? (
            reviewCandidate.detailedBreakdown.map((item) => {
              const isCorrect = item.isCorrect;
              return (
                <div key={item.questionNo} className={`review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  <div className="review-item-head">
                    <span className="review-item-no">Item #{item.questionNo}</span>
                    <span className={`review-item-badge ${isCorrect ? 'correct' : 'wrong'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  {item.imageFileName && (
                    <div className="review-item-image">
                      <img
                        src={`${API_BASE_URL}/static/images/${item.imageFileName}`}
                        alt={`Item #${item.questionNo} image`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  {item.questionText && <p className="review-item-text">{item.questionText}</p>}
                  <p className="review-answer-row">
                    <span className="review-answer-label">Your Answer:</span>
                    <span className={`review-answer-value ${isCorrect ? 'correct' : 'wrong'}`}>
                      {item.candidateAnswer
                        ? `${item.candidateAnswer}${item.candidateAnswerText ? ` - ${item.candidateAnswerText}` : ''}`
                        : '—'}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p className="review-answer-row">
                      <span className="review-answer-label">Correct Answer:</span>
                      <span className="review-answer-value correct">
                        {item.correctAnswer}{item.correctAnswerText ? ` - ${item.correctAnswerText}` : ''}
                      </span>
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="review-empty">No detailed breakdown available for this submission.</p>
          )}
        </div>

        <div className="review-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReviewCandidate(null)}
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
}