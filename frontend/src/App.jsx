import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

import { shuffleArray, THEME_STORAGE_KEY, getInitialTheme } from './utils/helpers';
import { 
  API_BASE_URL, 
  fetchQuestionsApi, 
  checkCandidateNameApi, 
  submitExamApi, 
  adminLoginApi, 
  fetchAdminResultsApi 
} from './api/api';

import ThemeToggle from './components/themetoggle';
import LightboxModal from './components/lightboxmodal';
import AdminLogin from './components/admin/adminlogin';
import AdminTable from './components/admin/admintable';
import ReviewModal from './components/admin/reviewmodal';
import CandidateForm from './components/exam/CandidateForm';
import ExamCard from './components/exam/ExamCard';
import ResultSummary from './components/exam/ResultSummary';

const initialTheme = getInitialTheme();
if (initialTheme === 'dark') {
  document.body.classList.add('dark-mode');
}

export default function App() {
  const [candidateName, setCandidateName] = useState('');
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(initialTheme === 'dark');

  const [isAdminView, setIsAdminView] = useState(() => {
    return new URLSearchParams(window.location.search).get('view') === 'admin';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminPassError, setAdminPassError] = useState('');
  const [adminResults, setAdminResults] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFetchError, setAdminFetchError] = useState('');
  const [reviewCandidate, setReviewCandidate] = useState(null);

  const confettiFiredRef = useRef(false);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setIsAdminView(params.get('view') === 'admin');
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
      /* localStorage unavailable */
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  useEffect(() => {
    if (!result || result.status !== 'PASSED' || confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const duration = 3000;
    const end = Date.now() + duration;

    confetti({
      particleCount: 140,
      spread: 90,
      startVelocity: 42,
      origin: { y: 0.6 },
      colors
    });

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [result]);

  useEffect(() => {
    if (isAdminView && isAdminAuthenticated) {
      fetchAdminResults();
    }
  }, [isAdminView, isAdminAuthenticated]);

  useEffect(() => {
    if (!isAdminView) {
      fetchQuestions();
    }
  }, [isAdminView]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length - 1) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion && nextQuestion.imageFileName) {
        const img = new Image();
        img.src = `${API_BASE_URL}/static/images/${nextQuestion.imageFileName}`;
      }
    }
  }, [currentQuestionIndex, questions]);

  const fetchAdminResults = async () => {
    setAdminLoading(true);
    setAdminFetchError('');
    try {
      const data = await fetchAdminResultsApi();
      setAdminResults(data);
    } catch (err) {
      setAdminFetchError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminPassError('');
    try {
      const data = await adminLoginApi(adminPassInput);
      if (data.success) {
        setIsAdminAuthenticated(true);
        setAdminPassError('');
      } else {
        setAdminPassError(data.error || 'Invalid passphrase. Access denied.');
      }
    } catch {
      setAdminPassError('Cannot connect to authentication server.');
    }
  };

  const fetchQuestions = async () => {
    try {
      const data = await fetchQuestionsApi();
      setQuestions(shuffleArray(data));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOptionSelect = (qNo, optionKey) => {
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
      const data = await checkCandidateNameApi(trimmedName);
      if (data.exists) {
        alert('This candidate has already completed the assessment. Re-examination is strictly prohibited.');
        return;
      }
      setStartTime(new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setIsExamStarted(true);
    } catch {
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
      const data = await submitExamApi({
        studentName: candidateName,
        answers: answers,
        startTime: startTime
      });
      if (data.error) {
        alert(data.error);
        return;
      }
      setResult(data);
    } catch {
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

  if (isAdminView) {
    return (
      <div className="portal-container">
        <header className="portal-header">
          <h1>RDE Technical Assessment Portal</h1>
          <p className="subtitle">Administrator Results Dashboard</p>
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
        </header>

        {!isAdminAuthenticated ? (
          <AdminLogin
            adminPassInput={adminPassInput}
            setAdminPassInput={setAdminPassInput}
            handleAdminLogin={handleAdminLogin}
            adminPassError={adminPassError}
          />
        ) : (
          <AdminTable
            adminResults={adminResults}
            adminLoading={adminLoading}
            adminFetchError={adminFetchError}
            fetchAdminResults={fetchAdminResults}
            setReviewCandidate={setReviewCandidate}
          />
        )}

        <ReviewModal
          reviewCandidate={reviewCandidate}
          setReviewCandidate={setReviewCandidate}
          API_BASE_URL={API_BASE_URL}
        />
      </div>
    );
  }

  return (
    <div className="portal-container">
      {(!isExamStarted || isAdminView) && (
        <header className="portal-header">
          <h1>RDE Technical Assessment Portal</h1>
          <p className="subtitle">Official Component & Device Identification Evaluation</p>
          <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
        </header>
      )}

      {!isExamStarted ? (
        <CandidateForm
          candidateName={candidateName}
          setCandidateName={setCandidateName}
          handleStartExam={handleStartExam}
          error={error}
        />
      ) : result ? (
        <ResultSummary result={result} />
      ) : (
        <ExamCard
          candidateName={candidateName}
          currentQuestionIndex={currentQuestionIndex}
          questions={questions}
          currentQuestion={currentQuestion}
          answers={answers}
          handleOptionSelect={handleOptionSelect}
          handleNextQuestion={handleNextQuestion}
          isLastQuestion={isLastQuestion}
          loading={loading}
          setLightboxImage={setLightboxImage}
          setIsLightboxOpen={setIsLightboxOpen}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          API_BASE_URL={API_BASE_URL}
        />
      )}

      <LightboxModal
        isOpen={isLightboxOpen}
        image={lightboxImage}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}