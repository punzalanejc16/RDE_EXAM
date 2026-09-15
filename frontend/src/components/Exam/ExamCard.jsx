import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { assetUrl } from '../../api/api';

function QuestionImage({ src, alt, onOpen }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="image-unavailable" role="img" aria-label="Image unavailable">
        <ImageOff size={28} aria-hidden="true" />
        <span>Image could not be loaded. Check your connection and reload the page.</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      className="question-asset clickable-image"
      onClick={onOpen}
      onError={() => setFailed(true)}
    />
  );
}

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
  submitError,
  setLightboxImage,
  setIsLightboxOpen,
  isDarkMode,
  toggleTheme
}) {
  const currentQuestionNo = currentQuestion?.questionNo;
  const isAnswered = currentQuestionNo ? Boolean(answers[currentQuestionNo]) : false;
  const imageSrc = assetUrl(currentQuestion?.imageUrl);

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

          {imageSrc && (
            <div className="asset-view">
              <QuestionImage
                key={imageSrc}
                src={imageSrc}
                alt={`Item #${currentQuestionIndex + 1}`}
                onOpen={() => {
                  setLightboxImage(imageSrc);
                  setIsLightboxOpen(true);
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
                    disabled={loading}
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

      {submitError && <p className="error-message exam-submit-error" role="alert">{submitError}</p>}

      <div className="action-bar">
        <button
          onClick={handleNextQuestion}
          className={`btn ${isLastQuestion ? 'btn-success' : 'btn-primary'}`}
          disabled={loading || !isAnswered}
        >
          {loading ? 'Submitting...' : isLastQuestion ? (submitError ? 'Retry Submission' : 'Submit Examination') : 'Next Question'}
        </button>
      </div>
    </div>
  );
}
