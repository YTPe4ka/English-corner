import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { student } from '../api';
import './StudentDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface NotificationItem {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  group?: number | null;
  group_detail?: {
    id: number;
    name: string;
  } | null;
  notification_type?: string;
}

interface StudentData {
  total_classes: number;
  present: number;
  absent: number;
  attendance_rate: number;
  records?: any[];
}

interface GradeData {
  total_assessments: number;
  average_grade: number;
  records?: any[];
}

interface PaymentData {
  current_balance: number;
  total_paid: number;
  payment_history?: any[];
}

export const StudentDashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<StudentData | null>(null);
  const [performance, setPerformance] = useState<GradeData | null>(null);
  const [payments, setPayments] = useState<PaymentData | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingNotificationId, setLoadingNotificationId] = useState<number | null>(null);

  const loadNotifications = async () => {
    if (!accessToken) return;

    try {
      const notificationsRes = await fetch(`${API_BASE}/notifications/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const notificationsData = notificationsRes.ok ? await notificationsRes.json() : [];
      const list = Array.isArray(notificationsData) ? notificationsData : notificationsData.results || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      navigate('/login/student');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [groupsData, attendanceData, performanceData, paymentsData] =
          await Promise.all([
            student.getGroups(accessToken),
            student.getAttendance(accessToken),
            student.getPerformance(accessToken),
            student.getPayments(accessToken),
          ]);

        setGroups(groupsData.results || []);
        setAttendance(attendanceData);
        setPerformance(performanceData);
        setPayments(paymentsData);
        await loadNotifications();
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

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!accessToken || notification.is_read) {
      if (notification.group) {
        navigate(`/admin/groups/${notification.group}`);
      }
      return;
    }

    try {
      setLoadingNotificationId(notification.id);
      const response = await fetch(`${API_BASE}/notifications/${notification.id}/mark_read/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(item => item.id === notification.id ? { ...item, is_read: true } : item));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    } finally {
      setLoadingNotificationId(null);
    }

    if (notification.group) {
      navigate(`/admin/groups/${notification.group}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard loading-dashboard">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard student-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Student Dashboard</h1>
          <div className="user-info">
            <span>{user?.username || 'Student'}</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error-message">{error}</div>}

        <div className="dashboard-grid">
          {/* Notifications Card */}
          <div className="card notifications-card full-width">
            <div className="notifications-header">
              <h2>Notifications</h2>
              <span className="notifications-count">
                {notifications.filter(item => !item.is_read).length} new
              </span>
            </div>
            {notifications.length > 0 ? (
              <ul className="notification-list">
                {notifications.slice(0, 8).map((notification) => (
                  <li
                    key={notification.id}
                    className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="notification-main">
                      <div className="notification-dot" />
                      <div className="notification-content">
                        <div className="notification-title-row">
                          <strong>{notification.group_detail?.name || 'General'}</strong>
                          <span className="notification-type">{notification.notification_type === 'unpaid_lessons' ? 'Unpaid lessons' : 'General'}</span>
                        </div>
                        <p>{notification.message}</p>
                        <div className="notification-meta">
                          <span>{notification.group_detail?.name ? `Group: ${notification.group_detail.name}` : 'General'}</span>
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {loadingNotificationId === notification.id && <span className="notification-loading">…</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No notifications yet</p>
            )}
          </div>

          {/* Attendance Card */}
          <div className="card attendance-card">
            <h2>Attendance</h2>
            {attendance ? (
              <div className="card-content">
                <div className="stat-row">
                  <span className="stat-label">Total Classes:</span>
                  <span className="stat-value">{attendance.total_classes}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Present:</span>
                  <span className="stat-value present">{attendance.present}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Absent:</span>
                  <span className="stat-value absent">{attendance.absent}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${attendance.attendance_rate}%`,
                      backgroundColor:
                        attendance.attendance_rate >= 80 ? '#10b981' : '#f59e0b',
                    }}
                  />
                </div>
                <div className="stat-rate">
                  Attendance Rate: {attendance.attendance_rate.toFixed(1)}%
                </div>
              </div>
            ) : (
              <p>No attendance data</p>
            )}
          </div>

          {/* Performance Card */}
          <div className="card performance-card">
            <h2>Grades</h2>
            {performance ? (
              <div className="card-content">
                <div className="stat-row">
                  <span className="stat-label">Total Assessments:</span>
                  <span className="stat-value">
                    {performance.total_assessments}
                  </span>
                </div>
                <div className="big-stat">
                  <span className="big-stat-label">Average Grade</span>
                  <span className="big-stat-value">
                    {performance.average_grade.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <p>No grade data</p>
            )}
          </div>

          {/* Payments Card */}
          <div className="card payments-card">
            <h2>Account Balance</h2>
            {payments ? (
              <div className="card-content">
                <div className="balance-section">
                  <span className="balance-label">Current Balance</span>
                  <span className="balance-amount">
                    ${payments.current_balance.toFixed(2)}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Total Paid:</span>
                  <span className="stat-value">
                    ${payments.total_paid.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p>No payment data</p>
            )}
          </div>

          {/* Groups Card */}
          <div className="card groups-card full-width">
            <h2>My Groups</h2>
            {groups.length > 0 ? (
              <div className="groups-list">
                {groups.map((group) => (
                  <div key={group.id} className="group-item">
                    <div className="group-info">
                      <h3>{group.name}</h3>
                      <p>{group.description || 'No description'}</p>
                      <span className="group-level">Level: {group.level}</span>
                    </div>
                    <div className="group-teacher">
                      <span className="label">Teacher:</span>
                      <span className="value">
                        {group.teacher?.user?.username || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Not enrolled in any groups</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
