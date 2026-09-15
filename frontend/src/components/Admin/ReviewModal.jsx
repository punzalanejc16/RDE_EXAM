import React, { useEffect, useState } from 'react';
import { assetUrl, fetchResultDetailApi } from '../../api/api';
import { formatDuration } from '../../utils/helpers';

export default function ReviewModal({ reviewCandidate, setReviewCandidate, onSessionExpired }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const resultId = reviewCandidate?.id;

  // The results list is lightweight; load the per-question breakdown only when a review is opened
  useEffect(() => {
    if (!resultId) return undefined;
    let cancelled = false;
    setDetail(null);
    setError('');
    setLoading(true);
    fetchResultDetailApi(resultId)
      .then(data => { if (!cancelled) setDetail(data); })
      .catch(err => {
        if (cancelled) return;
        if (err.status === 401) onSessionExpired();
        else setError(err.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resultId, reloadKey]);

  if (!reviewCandidate) return null;

  const record = detail || reviewCandidate;
  const breakdown = detail?.detailedBreakdown || [];

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
          <p><strong>Full Name:</strong> {record.studentName}</p>
          {record.attemptNumber && <p><strong>Attempt:</strong> #{record.attemptNumber}</p>}
          <p><strong>Score:</strong> {record.score} / {record.total}</p>
          <p><strong>Percentage:</strong> {record.percentage}%</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`admin-status ${record.status === 'PASSED' ? 'passed' : 'failed'}`}>
              {record.status}
            </span>
          </p>
          <p><strong>Completion Time:</strong> {record.timestamp}</p>
          {record.durationSeconds != null && <p><strong>Duration:</strong> {formatDuration(record.durationSeconds)}</p>}
        </div>

        <div className="review-breakdown">
          {loading ? (
            <p className="review-empty">Loading answers...</p>
          ) : error ? (
            <div className="review-empty">
              <p className="error-message">{error}</p>
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', marginTop: 12 }} onClick={() => setReloadKey(k => k + 1)}>
                Try Again
              </button>
            </div>
          ) : breakdown.length > 0 ? (
            breakdown.map((item) => {
              const isCorrect = item.isCorrect;
              return (
                <div key={item.questionNo} className={`review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  <div className="review-item-head">
                    <span className="review-item-no">Item #{item.questionNo}</span>
                    <span className={`review-item-badge ${isCorrect ? 'correct' : 'wrong'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  {item.imageUrl && (
                    <div className="review-item-image">
                      <img
                        src={assetUrl(item.imageUrl)}
                        alt={`Item #${item.questionNo} image`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  {item.questionText && <p className="review-item-text">{item.questionText}</p>}
                  <p className="review-answer-row">
                    <span className="review-answer-label">Candidate Answer:</span>
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
