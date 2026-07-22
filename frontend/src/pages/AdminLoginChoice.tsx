import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLoginChoice.css';

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 2c2.33 0 7 1.17 7 3.5V19H5v-2.5c0-2.33 4.67-3.5 7-3.5z" />
  </svg>
);

const SuperAdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="icon">
    <path d="M12 1l-3.78 6H1l5.16-1.52L2.58 11l5.16 1.52L1 18h7.22L12 23l3.78-6H23l-5.16 1.52 5.58 4.52-5.16-1.52L23 6h-7.22L12 1z" />
  </svg>
);

export const AdminLoginChoice: React.FC = () => {
  const navigate = useNavigate();

  const handleChoice = (type: 'admin' | 'superadmin') => {
    if (type === 'admin') {
      navigate('/login/admin/form');
    } else {
      navigate('/login/superadmin/form');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="login-container admin-choice-container">
      <div className="choice-card">
        <button className="back-button" onClick={handleBack}>
          ← Back to Home
        </button>

        <h1>Choose Login Type</h1>
        <p className="subtitle">Select your administration role</p>

        <div className="choice-grid">
          {/* Admin Card */}
          <div
            className="choice-card-item"
            onClick={() => handleChoice('admin')}
          >
            <div className="choice-icon admin-choice-icon">
              <AdminIcon />
            </div>
            <h2>Admin Login</h2>
            <p>Access regular admin features</p>
            <div className="features-list">
              <span>✓ Manage users</span>
              <span>✓ View reports</span>
              <span>✓ System settings</span>
            </div>
            <button className="choice-button">Continue as Admin</button>
          </div>

          {/* SuperAdmin Card */}
          <div
            className="choice-card-item superadmin"
            onClick={() => handleChoice('superadmin')}
          >
            <div className="superadmin-badge">SUPER</div>
            <div className="choice-icon superadmin-choice-icon">
              <SuperAdminIcon />
            </div>
            <h2>SuperAdmin Login</h2>
            <p>Full system control with 2FA verification</p>
            <div className="features-list">
              <span>✓ All admin features</span>
              <span>✓ Manage admins</span>
              <span>✓ View all logs</span>
              <span>✓ 2FA security</span>
            </div>
            <button className="choice-button superadmin-btn">
              Continue as SuperAdmin
            </button>
          </div>
        </div>

        <div className="demo-credentials">
          <h3>Demo Credentials</h3>
          <div className="credential-item">
            <strong>Admin:</strong>
            <p>Username: admin | Password: admin123</p>
          </div>
          <div className="credential-item">
            <strong>SuperAdmin:</strong>
            <p>Email: superadmin@englishcorner.com | Password: superadmin@englishcorner.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
