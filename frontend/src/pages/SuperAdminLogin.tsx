import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/config';
import './Login.css';

export const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { syncFromStorage } = useAuth();

  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/2fa/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await response.json();
      console.log(data.code);
      setSessionId(data.session_id);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/2fa/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Verification failed');
      }

      const data = await response.json();

      // Store tokens and user
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('role', 'superadmin');
      syncFromStorage();
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'login') {
      navigate('/login/admin');
    } else {
      setStep('login');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <button className="back-button-login" onClick={handleBack}>
          ← {step === 'login' ? 'Back' : 'Back to Login'}
        </button>

        <div className="login-form-wrapper">
          <div className="login-content">
            <h1>SuperAdmin Login</h1>
            <p className="login-description">
              {step === 'login'
                ? 'Enter your credentials to proceed'
                : 'Enter the verification code sent to your email'}
            </p>

            {step === 'login' ? (
              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@englishcorner.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>

                <div className="demo-section">
                  <p className="demo-label">Demo Credentials:</p>
                  <p>Email: superadmin@englishcorner.com</p>
                  <p>Password: superadmin@englishcorner.com</p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="login-form">
                <div className="verification-info">
                  <p>A 6-digit code has been sent to</p>
                  <p className="email-display">{email}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="code">Verification Code</label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    disabled={loading}
                    className="code-input"
                  />
                  <p className="code-hint">Enter the 6-digit code</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  type="button"
                  className="resend-button"
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        'http://localhost:8000/api/v1/admin/2fa/resend/',
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ session_id: sessionId }),
                        }
                      );
                      if (response.ok) {
                        setError('Code resent to your email');
                      }
                    } catch (err) {
                      setError('Failed to resend code');
                    }
                  }}
                >
                  Resend Code
                </button>
              </form>
            )}
          </div>

          <div className="login-illustration">
            <div className="illustration-placeholder">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Lock icon */}
                <circle cx="100" cy="80" r="40" stroke="#7c3aed" strokeWidth="2" />
                <path d="M 70 80 L 70 60 A 30 30 0 0 1 130 60 L 130 80" stroke="#7c3aed" strokeWidth="2" />
                <circle cx="100" cy="80" r="8" fill="#7c3aed" />
                <path d="M 95 80 L 95 95 M 105 80 L 105 95" stroke="#7c3aed" strokeWidth="2" />

                {/* 2FA Badge */}
                <rect x="120" y="140" width="60" height="40" rx="4" fill="#7c3aed" opacity="0.1" />
                <text x="150" y="162" fontSize="16" fontWeight="bold" fill="#7c3aed" textAnchor="middle">
                  2FA
                </text>
              </svg>
            </div>
            <h3>Two-Factor Authentication</h3>
            <p>Your account is protected with 2FA security</p>
          </div>
        </div>
      </div>
    </div>
  );
};
