import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://127.0.0.1:5000';

export default function App() {
  const [candidateName, setCandidateName] = useState('');
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/questions`);
      if (!res.ok) throw new Error('Failed to load assessment items from the backend server.');
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOptionSelect = (qNo, optionKey) => {
    if (isReviewMode) return;
    setAnswers(prev => ({
      ...prev,
      [qNo]: optionKey
    }));
  };

  const handleStartExam = async (e) => {
    e.preventDefault();
    const trimmedName = candidateName.trim();
    if (!trimmedName) {
      alert('Please enter Candidate Full Name.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: trimmedName })
      });
      const data = await res.json();
      if (data.exists) {
        alert('This candidate has already completed the assessment. Re-examination is strictly prohibited.');
        return;
      }
      setIsExamStarted(true);
    } catch (err) {
      alert('Error verifying candidate credentials. Please try again.');
    }
  };

  const handleSubmitExam = async () => {
    if (Object.keys(answers).length < questions.length) {
      const confirmSubmit = window.confirm('You have unanswered items. Are you sure you want to submit your examination?');
      if (!confirmSubmit) return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: candidateName,
          answers: answers
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setResult(data);
    } catch (err) {
      alert('Error submitting examination. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>RDE Technical Assessment Portal</h1>
        <p className="subtitle">Official Component & Device Identification Evaluation</p>
      </header>

      {!isExamStarted ? (
        <div className="card">
          <form onSubmit={handleStartExam}>
            <div className="form-group">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Candidate Full Name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. John Doe"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Start Examination
            </button>
          </form>
          {error && <p style={{ color: '#dc2626', marginTop: '10px' }}>{error}</p>}
        </div>
      ) : result && !isReviewMode ? (
        /* RESULT PAGE */
        <div className="card">
          <h2>Assessment Summary</h2>
          <div className={`result-banner ${result.status === 'PASSED' ? 'pass' : 'fail'}`}>
            <h3>Status: {result.status}</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0 0 0' }}>
              Score: {result.score} / {result.total} ({result.percentage}%)
            </p>
          </div>
          <p><strong>Candidate Name:</strong> {result.studentName}</p>
          <p><strong>Completion Date & Time:</strong> {result.timestamp}</p>
          
          <div className="action-bar" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => setIsReviewMode(true)} className="btn btn-primary">
              Review Submitted Answers
            </button>
          </div>
          
          <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center', color: '#64748b', fontSize: '13px', border: '1px solid #e2e8f0' }}>
            🔒 <strong>Assessment Locked:</strong> Multiple attempts are prohibited for this examination.
          </div>
        </div>
      ) : (
        /* EXAM QUESTION & REVIEW PAGE */
        <div>
          {/* Instructions Banner */}
          {isReviewMode ? (
            <div className="instruction-box" style={{ backgroundColor: '#f0fdf4', borderColor: '#16a34a', color: '#166534' }}>
              <strong>Review Mode Active:</strong> Displayed below are your selected responses alongside the official <span style={{ color: '#15803d', fontWeight: 'bold' }}>Correct Answer Keys</span> for evaluation.
            </div>
          ) : (
            <div className="instruction-box">
              <strong>General Instructions:</strong> Analyze each component image carefully. Select the correct classification, package type, or viewing orientation from the options provided below each image.
            </div>
          )}

          <div className="sticky-tracker">
            <div><strong>Candidate:</strong> {candidateName}</div>
            <div>
              {isReviewMode ? (
                <strong style={{ color: result.status === 'PASSED' ? '#16a34a' : '#dc2626' }}>
                  Final Score: {result.score} / {result.total}
                </strong>
              ) : (
                <span><strong>Progress:</strong> {Object.keys(answers).length} of {questions.length} Answered</span>
              )}
            </div>
          </div>

          {questions.map((q) => {
            const userAnswer = answers[q.questionNo];
            const correctAnswer = result?.answerKey?.[String(q.questionNo)];

            return (
              <div key={q.questionNo} className="card">
                {/* NUMBER NALANG NA NAKA-LEFT ALIGN */}
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e293b', textAlign: 'left' }}>
                  {q.questionNo}.
                </h3>
                
                {q.questionText && q.questionText.trim() !== '' && (
                  <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '16px', textAlign: 'left' }}>
                    {q.questionText}
                  </p>
                )}

                {q.imageFileName && (
                  <div className="asset-view">
                    <img
                      src={`${API_BASE_URL}/static/images/${q.imageFileName}`}
                      alt={`Item #${q.questionNo}`}
                      className="question-asset"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = 'https://via.placeholder.com/300x150?text=Image+Not+Found';
                      }}
                    />
                  </div>
                )}

                {/* Multiple Choice Options */}
                <div className="options-grid">
                  {Object.entries(q.options).map(([key, val]) => {
                    let cellClass = 'option-cell';
                    const isUserPick = key === userAnswer;
                    const isCorrectPick = key === correctAnswer;

                    if (isReviewMode) {
                      if (isCorrectPick) {
                        cellClass += ' correct-answer';
                      } else if (isUserPick && !isCorrectPick) {
                        cellClass += ' wrong-answer';
                      }
                    } else if (isUserPick) {
                      cellClass += ' active';
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        className={cellClass}
                        onClick={() => handleOptionSelect(q.questionNo, key)}
                        disabled={isReviewMode}
                      >
                        <span className="badge">{key}</span> {val}
                        
                        {/* Review Mode Badges */}
                        {isReviewMode && (
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {isUserPick && (
                              <span style={{ 
                                backgroundColor: isCorrectPick ? '#16a34a' : '#dc2626', 
                                color: '#ffffff', 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              }}>
                                YOUR ANSWER
                              </span>
                            )}
                            {isCorrectPick && (
                              <span style={{ 
                                backgroundColor: '#15803d', 
                                color: '#ffffff', 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                              }}>
                                ✓ CORRECT KEY
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="action-bar">
            {isReviewMode ? (
              <button onClick={() => setIsReviewMode(false)} className="btn btn-secondary">
                Back to Assessment Summary
              </button>
            ) : (
              <button
                onClick={handleSubmitExam}
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Examination'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}