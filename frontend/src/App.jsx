import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

import { shuffleArray, THEME_STORAGE_KEY, getInitialTheme } from './utils/helpers';
import { loadExamProgress, saveExamProgress, clearExamProgress } from './utils/examProgress';
import { ClipboardList, UserCheck, KeyRound, WifiOff } from 'lucide-react';
import {
  assetUrl,
  getStoredToken,
  setStoredToken,
  fetchMeApi,
  logoutApi,
  fetchQuestionsApi,
  startExamApi,
  submitExamApi,
  fetchAdminResultsApi,
  fetchUsersApi,
  fetchPasswordResetsApi
} from './api/api';

import ThemeToggle from './components/ThemeToggle';
import LightboxModal from './components/LightboxModal';
import SessionBar from './components/SessionBar';
import AuthPage from './components/Auth/AuthPage';
import AdminTable from './components/Admin/AdminTable';
import ReviewModal from './components/Admin/ReviewModal';
import UserApprovals from './components/Admin/UserApprovals';
import PasswordResets from './components/Admin/PasswordResets';
import CandidateWelcome from './components/Exam/CandidateWelcome';
import ExamCard from './components/Exam/ExamCard';
import ResultSummary from './components/Exam/ResultSummary';

const initialTheme = getInitialTheme();
if (initialTheme === 'dark') {
  document.body.classList.add('dark-mode');
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(() => Boolean(getStoredToken()));
  const [sessionError, setSessionError] = useState('');

  // Question pool (for the welcome screen) and the ordered questions of the active attempt
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [attemptTicket, setAttemptTicket] = useState(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(initialTheme === 'dark');

  const [adminTab, setAdminTab] = useState('approvals');
  const [adminResults, setAdminResults] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFetchError, setAdminFetchError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFetchError, setUsersFetchError] = useState('');
  const [resets, setResets] = useState([]);
  const [resetsLoading, setResetsLoading] = useState(false);
  const [resetsFetchError, setResetsFetchError] = useState('');
  const [reviewCandidate, setReviewCandidate] = useState(null);

  const confettiFiredRef = useRef(false);

  const isAdmin = currentUser?.role === 'admin';
  const isCandidate = currentUser?.role === 'candidate';

  const resetSessionState = () => {
    setIsExamStarted(false);
    setQuestions([]);
    setExamQuestions([]);
    setAttemptTicket(null);
    setAnswers({});
    setResult(null);
    setError(null);
    setSubmitError('');
    setStartTime(null);
    setCurrentQuestionIndex(0);
    setAdminTab('approvals');
    setAdminResults([]);
    setUsers([]);
    setResets([]);
    setReviewCandidate(null);
    confettiFiredRef.current = false;
  };

  // explicit = the user pressed Sign Out (end the session on the server and forget saved progress)
  const handleLogout = ({ explicit = true } = {}) => {
    if (explicit) {
      logoutApi().catch(() => { /* token is cleared locally regardless */ });
      if (currentUser?.role === 'candidate') clearExamProgress(currentUser.id);
    }
    setStoredToken(null);
    setCurrentUser(null);
    setSessionError('');
    resetSessionState();
  };

  const handleAuthenticated = (token, user) => {
    setStoredToken(token);
    resetSessionState();
    setSessionError('');
    setCurrentUser(user);
  };

  const restoreSession = async () => {
    setAuthChecking(true);
    setSessionError('');
    try {
      const data = await fetchMeApi();
      setCurrentUser(data.user);
    } catch (err) {
      // Only a rejected session signs the user out; a network problem keeps the saved session
      if (err.status === 401 || err.status === 403) setStoredToken(null);
      else setSessionError(err.message);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    if (getStoredToken()) restoreSession();
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
    if (isAdmin) {
      fetchUsers();
      fetchAdminResults();
      fetchResets();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isCandidate) {
      fetchQuestions({ resume: true });
    }
  }, [isCandidate]);

  // Save the active attempt on this device after every change
  useEffect(() => {
    if (!isCandidate || !isExamStarted || result || !attemptTicket) return;
    saveExamProgress(currentUser.id, {
      attemptTicket,
      startTime,
      order: examQuestions.map(q => q.questionNo),
      answers,
      index: currentQuestionIndex
    });
  }, [isCandidate, isExamStarted, result, attemptTicket, startTime, examQuestions, answers, currentQuestionIndex]);

  useEffect(() => {
    const nextQuestion = examQuestions[currentQuestionIndex + 1];
    if (nextQuestion?.imageUrl) {
      const img = new Image();
      img.src = assetUrl(nextQuestion.imageUrl);
    }
  }, [currentQuestionIndex, examQuestions]);

  // Expired/ended session → back to sign in
  const handleApiError = (err, setMessage) => {
    if (err.status === 401) {
      handleLogout({ explicit: false });
      return;
    }
    setMessage(err.message);
  };

  const fetchAdminResults = async () => {
    setAdminLoading(true);
    setAdminFetchError('');
    try {
      const data = await fetchAdminResultsApi();
      setAdminResults(data);
    } catch (err) {
      handleApiError(err, setAdminFetchError);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersFetchError('');
    try {
      const data = await fetchUsersApi();
      setUsers(data);
    } catch (err) {
      handleApiError(err, setUsersFetchError);
    } finally {
      setUsersLoading(false);
    }
  };

  const resumeSavedAttempt = (pool, user) => {
    const saved = loadExamProgress(user.id);
    if (!saved) return;
    const byNo = new Map(pool.map(q => [q.questionNo, q]));
    const ordered = saved.order.map(no => byNo.get(no)).filter(Boolean);
    if (ordered.length !== pool.length) {
      // The exam changed since this attempt was started
      clearExamProgress(user.id);
      return;
    }
    setExamQuestions(ordered);
    setAttemptTicket(saved.attemptTicket);
    setStartTime(saved.startTime);
    setAnswers(saved.answers || {});
    setCurrentQuestionIndex(Math.min(Math.max(0, saved.index || 0), ordered.length - 1));
    setIsExamStarted(true);
  };

  const fetchResets = async () => {
    setResetsLoading(true);
    setResetsFetchError('');
    try {
      setResets(await fetchPasswordResetsApi());
    } catch (err) {
      handleApiError(err, setResetsFetchError);
    } finally {
      setResetsLoading(false);
    }
  };

  const fetchQuestions = async ({ resume = false } = {}) => {
    setQuestionsLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionsApi();
      setQuestions(data);
      if (data.length === 0) {
        setError('No assessment items are available yet. Please contact the administrator.');
      } else if (resume) {
        resumeSavedAttempt(data, currentUser);
      }
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleOptionSelect = (qNo, optionKey) => {
    setAnswers(prev => ({
      ...prev,
      [qNo]: optionKey
    }));
  };

  // Every start is a fresh, server-issued attempt (retakes allowed)
  const handleStartExam = async () => {
    setStarting(true);
    setError(null);
    try {
      const data = await startExamApi();
      if (!data.questions?.length) {
        throw new Error('No assessment items are available yet. Please contact the administrator.');
      }
      setQuestions(data.questions);
      setExamQuestions(shuffleArray(data.questions));
      setAttemptTicket(data.attemptTicket);
      setStartTime(data.startTime);
      setAnswers({});
      setResult(null);
      setSubmitError('');
      setCurrentQuestionIndex(0);
      confettiFiredRef.current = false;
      setIsExamStarted(true);
    } catch (err) {
      setIsExamStarted(false);
      setResult(null);
      handleApiError(err, setError);
    } finally {
      setStarting(false);
    }
  };

  const handleBackToDashboard = () => {
    setIsExamStarted(false);
    setResult(null);
    setAnswers({});
    setExamQuestions([]);
    setAttemptTicket(null);
    setCurrentQuestionIndex(0);
  };

  const handleSubmitExam = async () => {
    if (Object.keys(answers).length < examQuestions.length) {
      const confirmSubmit = window.confirm('You have unanswered items. Are you sure you want to submit your examination?');
      if (!confirmSubmit) return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      // Same attemptTicket on retry → the server returns the already-saved result instead of a duplicate
      const data = await submitExamApi({ attemptTicket, answers });
      clearExamProgress(currentUser.id);
      setResult(data);
      setCurrentUser(prev => ({
        ...prev,
        attemptCount: (prev.attemptCount || 0) + (data.alreadySubmitted ? 0 : 1),
        lastAttempt: {
          score: data.score,
          total: data.total,
          percentage: data.percentage,
          status: data.status,
          timestamp: data.timestamp
        }
      }));
    } catch (err) {
      if (err.status === 401) {
        handleLogout({ explicit: false });
        return;
      }
      if (err.status === 400 && /attempt/i.test(err.message)) {
        // Expired or invalid attempt: it can't be submitted, so start over
        clearExamProgress(currentUser.id);
        handleBackToDashboard();
        setError(err.message);
        return;
      }
      setSubmitError(err.isNetworkError
        ? `${err.message} Your answers are saved on this device.`
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    const isLastQuestion = currentQuestionIndex === examQuestions.length - 1;
    if (isLastQuestion) {
      handleSubmitExam();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const currentQuestion = examQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === examQuestions.length - 1;

  const header = (subtitle) => (
    <header className="portal-header">
      <h1>RDE Technical Assessment Portal</h1>
      <p className="subtitle">{subtitle}</p>
      <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
    </header>
  );

  if (authChecking) {
    return (
      <div className="portal-container">
        {header('Official Component & Device Identification Evaluation')}
        <div className="card compact-card"><p className="admin-empty">Restoring your session...</p></div>
      </div>
    );
  }

  if (sessionError && !currentUser) {
    return (
      <div className="portal-container">
        {header('Official Component & Device Identification Evaluation')}
        <div className="card compact-card">
          <div className="card-header">
            <div className="welcome-icon locked"><WifiOff size={28} aria-hidden="true" /></div>
            <h2>Can't Reach the Server</h2>
            <p className="greeting">{sessionError}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={restoreSession}>
            Try Again
          </button>
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={() => handleLogout({ explicit: false })}>
              Sign in with a different account
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="portal-container">
        {header('Official Component & Device Identification Evaluation')}
        <AuthPage onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  if (isAdmin) {
    const pendingCount = users.filter(u => u.status === 'pending').length;
    const pendingResetCount = resets.filter(r => r.status === 'pending').length;
    return (
      <div className="portal-container admin-container">
        {header('Administrator Dashboard')}
        <SessionBar user={currentUser} onLogout={() => handleLogout()} />

        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 'approvals'}
            className={`admin-tab ${adminTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setAdminTab('approvals')}
          >
            <UserCheck size={16} aria-hidden="true" /> Account Approvals
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 'resets'}
            className={`admin-tab ${adminTab === 'resets' ? 'active' : ''}`}
            onClick={() => setAdminTab('resets')}
          >
            <KeyRound size={16} aria-hidden="true" /> Password Resets
            {pendingResetCount > 0 && <span className="tab-badge">{pendingResetCount}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 'results'}
            className={`admin-tab ${adminTab === 'results' ? 'active' : ''}`}
            onClick={() => setAdminTab('results')}
          >
            <ClipboardList size={16} aria-hidden="true" /> Exam Results
          </button>
        </div>

        {adminTab === 'approvals' ? (
          <UserApprovals
            users={users}
            loading={usersLoading}
            fetchError={usersFetchError}
            onRefresh={fetchUsers}
            onUserChanged={(updated) => setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))}
            onUserDeleted={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
          />
        ) : adminTab === 'resets' ? (
          <PasswordResets
            requests={resets}
            loading={resetsLoading}
            fetchError={resetsFetchError}
            onRefresh={fetchResets}
            onRequestChanged={(updated) => setResets(prev => prev.map(r => (r.id === updated.id ? updated : r)))}
          />
        ) : (
          <AdminTable
            adminResults={adminResults}
            adminLoading={adminLoading}
            adminFetchError={adminFetchError}
            fetchAdminResults={fetchAdminResults}
            setReviewCandidate={setReviewCandidate}
            onResultDeleted={(id) => setAdminResults(prev => prev.filter(r => r.id !== id))}
          />
        )}

        <ReviewModal
          reviewCandidate={reviewCandidate}
          setReviewCandidate={setReviewCandidate}
          onSessionExpired={() => handleLogout({ explicit: false })}
        />
      </div>
    );
  }

  return (
    <div className="portal-container">
      {(!isExamStarted || result) && (
        <>
          {header('Official Component & Device Identification Evaluation')}
          <SessionBar user={currentUser} onLogout={() => handleLogout()} />
        </>
      )}

      {!isExamStarted ? (
        <CandidateWelcome
          user={currentUser}
          questionCount={questions.length}
          questionsLoading={questionsLoading}
          starting={starting}
          onStart={handleStartExam}
          onRetry={() => fetchQuestions()}
          error={error}
        />
      ) : result ? (
        <ResultSummary
          result={result}
          onBackToDashboard={handleBackToDashboard}
          onRetake={handleStartExam}
          retaking={starting}
        />
      ) : (
        <ExamCard
          candidateName={currentUser.fullName}
          currentQuestionIndex={currentQuestionIndex}
          questions={examQuestions}
          currentQuestion={currentQuestion}
          answers={answers}
          handleOptionSelect={handleOptionSelect}
          handleNextQuestion={handleNextQuestion}
          isLastQuestion={isLastQuestion}
          loading={loading}
          submitError={submitError}
          setLightboxImage={setLightboxImage}
          setIsLightboxOpen={setIsLightboxOpen}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
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
