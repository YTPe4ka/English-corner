import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

type RoleType = 'student' | 'teacher' | 'admin';

export const Login: React.FC = () => {
  const { role } = useParams<{ role?: RoleType }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  let currentRole: RoleType = 'student';
  
  if (location.pathname === '/login/admin/form') {
    currentRole = 'admin';
  } else if (role === 'student' || role === 'teacher' || role === 'admin') {
    currentRole = role;
  }

  const roleInfo = {
    student: {
      title: 'Student Sign In',
      subtitle: 'Welcome back! Enter your details to view your learning progress.',
      icon: '🎓',
    },
    teacher: {
      title: 'Teacher Sign In',
      subtitle: 'Welcome back! Sign in to manage your classes and students.',
      icon: '📚',
    },
    admin: {
      title: 'Admin Sign In',
      subtitle: 'System Administration Access.',
      icon: '⚙️',
    },
  };

  const info = roleInfo[currentRole] || roleInfo.student;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, currentRole);
      setTimeout(() => {
        navigate(`/${currentRole}/dashboard`);
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (location.pathname === '/login/admin/form') {
      navigate('/login/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="login-page">
      <div className="login-ambient-glow"></div>

      <button className="back-button" onClick={handleBack} title="Back to main page">
        ← Back
      </button>

      <div className="login-container">
        <div className="login-box glass-card animate-fade-in">
          <div className="login-header">
            <span className="role-avatar-badge">{info.icon}</span>
            <h1 className="login-title">{info.title}</h1>
            <p className="login-subtitle">{info.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">⚠️ {error}</div>}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. student1"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn-purple login-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In To Account ➜'}
            </button>
          </form>

          <div className="demo-info">
            <p className="demo-title">💡 DEMO ACCESS CREDENTIALS</p>
            <p className="demo-code">
              {currentRole === 'student' && 'User: student1 | Pass: password123'}
              {currentRole === 'teacher' && 'User: teacher1 | Pass: password123'}
              {currentRole === 'admin' && 'User: superadmin | Pass: SuperAdmin123!'}
            </p>
          </div>
        </div>

        <div className="login-illustration">
          <div className="purple-card-artwork">
            <div className="artwork-icon-large">{info.icon}</div>
            <h2>English Corner Platform</h2>
            <p>Empowering teachers, students, and administrators with real-time analytics & tools.</p>
            <div className="decorative-glow-circle"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
