import React, { useState } from 'react';
import {
  LogIn, UserPlus, User, AtSign, Mail, Lock, Eye, EyeOff, KeyRound, MailQuestion,
  Clock, XCircle, CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi } from '../../api/api';

const EMPTY_SIGNUP = { fullName: '', username: '', email: '', password: '', confirmPassword: '' };

function InputField({ icon: Icon, label, type = 'text', value, onChange, placeholder, autoComplete, autoFocus, hint, trailing, footer, required = true }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="input-with-icon">
        <Icon className="input-icon" size={18} aria-hidden="true" />
        <input
          type={type}
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
        />
        {trailing}
      </div>
      {hint && <p className="form-hint">{hint}</p>}
      {footer}
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete, hint, footer }) {
  const [visible, setVisible] = useState(false);
  return (
    <InputField
      icon={Lock}
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      hint={hint}
      footer={footer}
      trailing={
        <button
          type="button"
          className="input-trailing-btn"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

function Notice({ tone, icon: Icon, title, children }) {
  return (
    <div className={`auth-notice ${tone}`} role="status">
      <Icon size={20} className="auth-notice-icon" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState(EMPTY_SIGNUP);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [accountStatus, setAccountStatus] = useState(null);
  const [registeredName, setRegisteredName] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [notice, setNotice] = useState('');
  const [resetForm, setResetForm] = useState({ identifier: '', code: '', password: '', confirmPassword: '' });

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
    setAccountStatus(null);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await forgotPasswordApi(forgotIdentifier.trim());
      setResetForm(prev => ({ ...prev, identifier: forgotIdentifier.trim() }));
      setNotice(data.message);
      setMode('requested');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (resetForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordApi({
        identifier: resetForm.identifier.trim(),
        code: resetForm.code.trim(),
        newPassword: resetForm.password
      });
      setLoginForm({ username: resetForm.identifier.trim(), password: '' });
      setResetForm({ identifier: '', code: '', password: '', confirmPassword: '' });
      setNotice('Your password has been changed. Please sign in with your new password.');
      setMode('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateReset = (field) => (value) => setResetForm(prev => ({ ...prev, [field]: value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAccountStatus(null);
    setSubmitting(true);
    try {
      const data = await loginApi(loginForm.username.trim(), loginForm.password);
      onAuthenticated(data.token, data.user);
    } catch (err) {
      if (err.data?.accountStatus) setAccountStatus(err.data.accountStatus);
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (signupForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { confirmPassword: _unused, ...payload } = signupForm;
      await registerApi(payload);
      setRegisteredName(signupForm.fullName.trim());
      setLoginForm({ username: signupForm.username.trim(), password: '' });
      setSignupForm(EMPTY_SIGNUP);
      setMode('registered');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateSignup = (field) => (value) => setSignupForm(prev => ({ ...prev, [field]: value }));
  const updateLogin = (field) => (value) => setLoginForm(prev => ({ ...prev, [field]: value }));

  if (mode === 'requested') {
    return (
      <div className="card compact-card auth-card">
        <div className="auth-success">
          <div className="auth-success-icon">
            <CheckCircle2 size={36} aria-hidden="true" />
          </div>
          <h2>Reset Request Sent</h2>
          <p>{notice}</p>
          <p className="auth-muted">
            Once the administrator approves it, they will give you a one-time reset code.
            Enter that code below to set a new password.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => switchMode('reset')}>
            I Have a Reset Code
          </button>
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <div key={mode} className="card compact-card auth-card">
        <div className="card-header">
          <div className="welcome-icon"><MailQuestion size={26} aria-hidden="true" /></div>
          <h2>Forgot Password</h2>
          <p className="greeting">
            Enter your username or email. Your request goes to the administrator, who will give you a
            one-time reset code.
          </p>
        </div>

        {error && <Notice tone="danger" icon={AlertCircle} title={error} />}

        <form onSubmit={handleForgotPassword}>
          <InputField
            icon={AtSign}
            label="Username or Email"
            value={forgotIdentifier}
            onChange={setForgotIdentifier}
            placeholder="e.g. jdelacruz or you@example.com"
            autoComplete="username"
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending Request...' : 'Request Password Reset'}
          </button>
          <p className="auth-switch">
            Already have a code?{' '}
            <button type="button" className="link-btn" onClick={() => switchMode('reset')}>
              Enter reset code
            </button>
          </p>
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Back to Sign In
            </button>
          </p>
        </form>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div key={mode} className="card compact-card auth-card">
        <div className="card-header">
          <div className="welcome-icon"><KeyRound size={26} aria-hidden="true" /></div>
          <h2>Set a New Password</h2>
          <p className="greeting">Enter the one-time code the administrator gave you.</p>
        </div>

        {error && <Notice tone="danger" icon={AlertCircle} title={error} />}

        <form onSubmit={handleResetPassword}>
          <InputField
            icon={AtSign}
            label="Username or Email"
            value={resetForm.identifier}
            onChange={updateReset('identifier')}
            placeholder="e.g. jdelacruz"
            autoComplete="username"
            autoFocus={!resetForm.identifier}
          />
          <InputField
            icon={KeyRound}
            label="Reset Code"
            value={resetForm.code}
            onChange={(v) => updateReset('code')(v.toUpperCase())}
            placeholder="ABCD-2345"
            autoComplete="one-time-code"
            autoFocus={Boolean(resetForm.identifier)}
            hint="The code expires shortly after the administrator issues it."
          />
          <PasswordField
            label="New Password"
            value={resetForm.password}
            onChange={updateReset('password')}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            value={resetForm.confirmPassword}
            onChange={updateReset('confirmPassword')}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Change Password'}
          </button>
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Back to Sign In
            </button>
          </p>
        </form>
      </div>
    );
  }

  if (mode === 'registered') {
    return (
      <div className="card compact-card auth-card">
        <div className="auth-success">
          <div className="auth-success-icon">
            <CheckCircle2 size={36} aria-hidden="true" />
          </div>
          <h2>Registration Submitted</h2>
          <p>
            Thank you{registeredName ? `, ${registeredName}` : ''}. Your account has been created and is now
            <span className="status-pill pending">Pending Approval</span>
          </p>
          <p className="auth-muted">
            An administrator will review your registration. You'll be able to sign in and take the
            examination once your account is approved.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => switchMode('login')}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  const isLogin = mode === 'login';

  return (
    <div key={mode} className="card compact-card auth-card">
      <div className="card-header">
        <div className="welcome-icon">
          {isLogin ? <LogIn size={26} aria-hidden="true" /> : <UserPlus size={26} aria-hidden="true" />}
        </div>
        <h2>{isLogin ? 'Welcome Back' : 'Candidate Registration'}</h2>
        <p className="greeting">
          {isLogin
            ? 'Sign in to access your technical assessment.'
            : 'Create an account. Access is granted after administrator approval.'}
        </p>
      </div>

      {accountStatus === 'pending' && (
        <Notice tone="warning" icon={Clock} title="Account pending approval">
          Your registration is still being reviewed by an administrator. Please check back later.
        </Notice>
      )}
      {accountStatus === 'rejected' && (
        <Notice tone="danger" icon={XCircle} title="Registration not approved">
          Your account request was declined. Please contact the administrator for assistance.
        </Notice>
      )}
      {error && (
        <Notice tone="danger" icon={AlertCircle} title={error} />
      )}
      {notice && !error && (
        <Notice tone="success" icon={CheckCircle2} title={notice} />
      )}

      {isLogin ? (
        <form onSubmit={handleLogin}>
          <InputField
            icon={AtSign}
            label="Username"
            value={loginForm.username}
            onChange={updateLogin('username')}
            placeholder="Enter your username"
            autoComplete="username"
            autoFocus
          />
          <PasswordField
            label="Password"
            value={loginForm.password}
            onChange={updateLogin('password')}
            placeholder="Enter your password"
            autoComplete="current-password"
            footer={
              <div className="forgot-row">
                <button type="button" className="link-btn" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              </div>
            }
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
          <p className="auth-switch">
            New candidate?{' '}
            <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
              Create an account
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <InputField
            icon={User}
            label="Full Name"
            value={signupForm.fullName}
            onChange={updateSignup('fullName')}
            placeholder="e.g. Juan Dela Cruz"
            autoComplete="name"
            autoFocus
          />
          <div className="form-row">
            <InputField
              icon={AtSign}
              label="Username"
              value={signupForm.username}
              onChange={updateSignup('username')}
              placeholder="e.g. jdelacruz"
              autoComplete="username"
            />
            <InputField
              icon={Mail}
              label="Email"
              type="email"
              value={signupForm.email}
              onChange={updateSignup('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <PasswordField
            label="Password"
            value={signupForm.password}
            onChange={updateSignup('password')}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Password"
            value={signupForm.confirmPassword}
            onChange={updateSignup('confirmPassword')}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Create Account'}
          </button>
          <p className="auth-switch">
            Already registered?{' '}
            <button type="button" className="link-btn" onClick={() => switchMode('login')}>
              Sign in
            </button>
          </p>
        </form>
      )}

      <div className="auth-footnote">
        <ShieldCheck size={14} aria-hidden="true" />
        New accounts require administrator approval before exam access.
      </div>
    </div>
  );
}
