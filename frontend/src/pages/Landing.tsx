import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

// Enhanced SVG Icons
const StudentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const TeacherIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LogoIcon = () => (
  <svg viewBox="0 0 100 100" fill="none" className="logo-svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#D946EF" />
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="80" height="80" rx="24" fill="url(#logoGrad)" />
    <path
      d="M32 32 H68 V42 H44 V48 H62 V58 H44 V66 H68 V76 H32 Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const loginCards = [
    {
      role: 'Student Portal',
      description: 'Access your lessons, track your balance, grades, and attendance.',
      icon: StudentIcon,
      path: '/login/student',
      badge: 'Learn & Grow',
    },
    {
      role: 'Teacher Portal',
      description: 'Manage class schedules, student attendance, and performance logs.',
      icon: TeacherIcon,
      path: '/login/teacher',
      badge: 'Manage Classes',
    },
    {
      role: 'Admin Console',
      description: 'Full administrative control over users, groups, finance, and system logs.',
      icon: AdminIcon,
      path: '/login/admin',
      badge: 'System Control',
    },
  ];

  return (
    <div className="landing-page">
      {/* Background Ambient Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>

      {/* Branded Header */}
      <header className="landing-header">
        <div className="header-container">
          <div className="brand-badge">
            <LogoIcon />
            <div className="brand-info">
              <span className="brand-name">English Corner</span>
              <span className="brand-tag">LEARNING PLATFORM</span>
            </div>
          </div>
          <div className="header-status">
            <span className="live-dot"></span> System Online
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="landing-main">
        <div className="hero-content">
          <span className="hero-pill">✨ Next-Generation Education Portal</span>
          <h1 className="hero-title">
            Welcome to <span className="purple-gradient-text">English Corner</span>
          </h1>
          <p className="hero-subtitle">
            Choose your portal below to sign in and experience a seamless learning management ecosystem.
          </p>
        </div>

        <div className="cards-grid">
          {loginCards.map((card, idx) => (
            <div
              key={card.path}
              className="role-card glass-card animate-fade-in"
              style={{ animationDelay: `${idx * 0.15}s` }}
              onClick={() => navigate(card.path)}
            >
              <div className="card-badge">{card.badge}</div>
              <div className="icon-wrapper">
                <card.icon />
              </div>
              <h2 className="card-role-title">{card.role}</h2>
              <p className="card-description">{card.description}</p>
              <button
                className="btn-purple portal-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(card.path);
                }}
              >
                Enter Portal ➜
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Sleek Footer */}
      <footer className="landing-footer">
        <p>© 2026 English Corner Platform • Secure & Encrypted</p>
      </footer>
    </div>
  );
};
