import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { teacher } from '../api';
import './TeacherDashboard.css';

export const TeacherDashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'grades'>('overview');

  useEffect(() => {
    if (!accessToken) {
      navigate('/login/teacher');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [groupsData, attendanceData, performanceData] = await Promise.all([
          teacher.getGroups(accessToken),
          teacher.getAttendance(accessToken),
          teacher.getPerformance(accessToken),
        ]);

        setGroups(groupsData.results || []);
        setAttendance(attendanceData.results || []);
        setPerformance(performanceData.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accessToken, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard loading-dashboard">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard teacher-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Teacher Dashboard</h1>
          <div className="user-info">
            <span>{user?.username || 'Teacher'}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={`tab ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          Grades
        </button>
      </nav>

      <main className="dashboard-main">
        {error && <div className="error-message">{error}</div>}

        {activeTab === 'overview' && (
          <div className="dashboard-grid">
            {/* Groups Card */}
            <div className="card full-width">
              <h2>My Classes</h2>
              {groups.length > 0 ? (
                <div className="groups-grid">
                  {groups.map((group) => (
                    <div key={group.id} className="group-card">
                      <h3>{group.name}</h3>
                      <p className="group-description">
                        {group.description || 'No description'}
                      </p>
                      <div className="group-meta">
                        <span className="level-badge">{group.level}</span>
                        <span className="students-count">
                          {group.students_count} students
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No classes assigned yet</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="card stats-card">
              <h2>Quick Stats</h2>
              <div className="stats-content">
                <div className="stat-item">
                  <span className="stat-number">{groups.length}</span>
                  <span className="stat-label">Classes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{attendance.length}</span>
                  <span className="stat-label">Attendance Records</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{performance.length}</span>
                  <span className="stat-label">Grades Given</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="dashboard-grid">
            <div className="card full-width">
              <h2>Attendance Records</h2>
              {attendance.length > 0 ? (
                <div className="records-table">
                  <div className="table-header">
                    <div className="col-student">Student</div>
                    <div className="col-group">Group</div>
                    <div className="col-date">Date</div>
                    <div className="col-status">Status</div>
                  </div>
                  {attendance.slice(0, 10).map((record) => (
                    <div key={record.id} className="table-row">
                      <div className="col-student">
                        {record.student?.user?.username || 'N/A'}
                      </div>
                      <div className="col-group">{record.group || 'N/A'}</div>
                      <div className="col-date">{new Date(record.date).toLocaleDateString()}</div>
                      <div className="col-status">
                        <span className={record.is_present ? 'present' : 'absent'}>
                          {record.is_present ? '✓ Present' : '✗ Absent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No attendance records yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="dashboard-grid">
            <div className="card full-width">
              <h2>Grades</h2>
              {performance.length > 0 ? (
                <div className="records-table">
                  <div className="table-header">
                    <div className="col-student">Student</div>
                    <div className="col-group">Group</div>
                    <div className="col-grade">Grade</div>
                    <div className="col-date">Date</div>
                  </div>
                  {performance.slice(0, 10).map((record) => (
                    <div key={record.id} className="table-row">
                      <div className="col-student">
                        {record.student?.user?.username || 'N/A'}
                      </div>
                      <div className="col-group">{record.group || 'N/A'}</div>
                      <div className="col-grade">
                        <span className="grade-badge">{record.grade}%</span>
                      </div>
                      <div className="col-date">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No grades recorded yet</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
