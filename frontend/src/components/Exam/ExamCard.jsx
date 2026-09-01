import React from 'react';
import ThemeToggle from '../ThemeToggle';

export default function ExamCard({
  candidateName,
  currentQuestionIndex,
  questions = [],
  currentQuestion,
  answers = {},
  handleOptionSelect,
  handleNextQuestion,
  isLastQuestion,
  loading,
  setLightboxImage,
  setIsLightboxOpen,
  isDarkMode,
  toggleTheme,
  API_BASE_URL
}) {
  const currentQuestionNo = currentQuestion?.questionNo;
  const isAnswered = currentQuestionNo ? Boolean(answers[currentQuestionNo]) : false;

  return (
    <div className="exam-view">
      <div className="instruction-box">
        <strong>General Instructions:</strong> Analyze each component image carefully. Select the correct classification, package type, or viewing orientation from the options provided below each image.
      </div>

      <div className="sticky-tracker">
        <div><strong>Candidate:</strong> {candidateName}</div>
        <div>
          <span><strong>Question {currentQuestionIndex + 1} of {questions.length}</strong></span>
        </div>
        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
      </div>

      {currentQuestion ? (
        <div className="card">
          <h3 className="question-number">Question {currentQuestionIndex + 1}.</h3>

          {currentQuestion.questionText && currentQuestion.questionText.trim() !== '' && (
            <p className="question-text">{currentQuestion.questionText}</p>
          )}

          {currentQuestion.imageFileName && (
            <div className="asset-view">
              <img
                src={`${API_BASE_URL}/static/images/${currentQuestion.imageFileName}`}
                alt={`Item #${currentQuestion.questionNo}`}
                loading="lazy"
                decoding="async"
                className="question-asset clickable-image"
                onClick={() => {
                  setLightboxImage(`${API_BASE_URL}/static/images/${currentQuestion.imageFileName}`);
                  setIsLightboxOpen(true);
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/300x150?text=Image+Not+Found';
                }}
              />
            </div>
          )}

          {currentQuestion.options && (
            <div className="options-grid">
              {Object.entries(currentQuestion.options).map(([key, val]) => {
                let cellClass = 'option-cell';
                const isUserPick = key === answers[currentQuestion.questionNo];
                if (isUserPick) cellClass += ' active';

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
          )}
        </div>
      ) : (
        <div className="card">
          <p>Loading question...</p>
        </div>
      )}

      <div className="action-bar">
        <button
          onClick={handleNextQuestion}
          className={`btn ${isLastQuestion ? 'btn-success' : 'btn-primary'}`}
          disabled={loading || !isAnswered}
        >
          {loading ? 'Submitting...' : isLastQuestion ? 'Submit Examination' : 'Next Question'}
        </button>
      </div>
    </div>
  );
}