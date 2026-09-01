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
  const [startTime, setStartTime] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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
      setStartTime(new Date().toLocaleString());
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
          answers: answers,
          startTime: startTime
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

  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    if (isLastQuestion) {
      handleSubmitExam();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1>RDE Technical Assessment Portal</h1>
        <p className="subtitle">Official Component & Device Identification Evaluation</p>
      </header>

      {!isExamStarted ? (
        <div className="card compact-card">
          <div className="card-header">
            <h2>Candidate Verification</h2>
            <p className="greeting">Good luck on your examination!</p>
          </div>
          <form onSubmit={handleStartExam}>
            <div className="form-group">
              <label className="form-label">
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
          {error && <p className="error-message">{error}</p>}
        </div>
      ) : result && !isReviewMode ? (
        /* RESULT PAGE */
        <div className="card">
          <h2>Assessment Summary</h2>
          <div className={`result-banner ${result.status === 'PASSED' ? 'pass' : 'fail'}`}>
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
            <button onClick={() => setIsReviewMode(true)} className="btn btn-primary" style={{ width: 'auto' }}>
              Review Submitted Answers
            </button>
          </div>

          <div className="assessment-locked">
            🔒 <strong>Assessment Locked:</strong> Multiple attempts are prohibited for this examination.
          </div>
        </div>
      ) : (
        /* EXAM QUESTION & REVIEW PAGE */
        <div>
          {isReviewMode ? (
            <div className="instruction-box review">
              <strong>Review Mode Active:</strong> Displayed below are your selected responses alongside the official <span className="review-accent">Correct Answer Keys</span> for evaluation.
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
                <span><strong>Question {currentQuestionIndex + 1} of {questions.length}</strong></span>
              )}
            </div>
          </div>

          {isReviewMode ? (
            /* REVIEW MODE: Show all questions */
            questions.map((q) => {
              const userAnswer = answers[q.questionNo];
              const correctAnswer = result?.answerKey?.[String(q.questionNo)];

              return (
                <div key={q.questionNo} className="card">
                  <h3 className="question-number">
                    {q.questionNo}.
                  </h3>

                  {q.questionText && q.questionText.trim() !== '' && (
                    <p className="question-text">
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

                  <div className="options-grid">
                    {Object.entries(q.options).map(([key, val]) => {
                      let cellClass = 'option-cell';
                      const isUserPick = key === userAnswer;
                      const isCorrectPick = key === correctAnswer;

                      if (isCorrectPick) {
                        cellClass += ' correct-answer';
                      } else if (isUserPick && !isCorrectPick) {
                        cellClass += ' wrong-answer';
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          className={cellClass}
                          disabled
                        >
                          <span className="badge">{key}</span> {val}

                          <div className="review-badge-group">
                            {isUserPick && (
                              <span className={`review-badge user-answer${isCorrectPick ? ' is-correct' : ''}`}>
                                YOUR ANSWER
                              </span>
                            )}
                            {isCorrectPick && (
                              <span className="review-badge correct-key">
                                ✓ CORRECT KEY
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            /* EXAM MODE: Show one question at a time */
            currentQuestion && (
              <div className="card">
                <h3 className="question-number">
                  {currentQuestion.questionNo}.
                </h3>

                {currentQuestion.questionText && currentQuestion.questionText.trim() !== '' && (
                  <p className="question-text">
                    {currentQuestion.questionText}
                  </p>
                )}

                {currentQuestion.imageFileName && (
                  <div className="asset-view">
                    <img
                      src={`${API_BASE_URL}/static/images/${currentQuestion.imageFileName}`}
                      alt={`Item #${currentQuestion.questionNo}`}
                      className="question-asset"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300x150?text=Image+Not+Found';
                      }}
                    />
                  </div>
                )}

                <div className="options-grid">
                  {Object.entries(currentQuestion.options).map(([key, val]) => {
                    let cellClass = 'option-cell';
                    const isUserPick = key === answers[currentQuestion.questionNo];

                    if (isUserPick) {
                      cellClass += ' active';
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        className={cellClass}
                        onClick={() => handleOptionSelect(currentQuestion.questionNo, key)}
                      >
                        <span className="badge">{key}</span> {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          <div className="action-bar">
            {isReviewMode ? (
              <button onClick={() => setIsReviewMode(false)} className="btn btn-secondary">
                Back to Assessment Summary
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className={`btn ${isLastQuestion ? 'btn-success' : 'btn-primary'}`}
                disabled={loading || !answers[currentQuestion?.questionNo]}
              >
                {loading ? 'Submitting...' : isLastQuestion ? 'Submit Examination' : 'Next Question'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
