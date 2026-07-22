import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './TeacherDetail.css';

const API_BASE = 'http://localhost:8000/api/v1';

interface UserDetail {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Teacher {
  id: number;
  user_detail?: UserDetail;
  user?: UserDetail;
  specialization?: string;
  is_active: boolean;
  phone?: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  price_per_month: number | string;
  max_students: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  schedule_type?: string;
  students_count?: number;
  students?: any[];
}

export const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      navigate('/login/admin');
      return;
    }
    loadTeacherData();
  }, [id, accessToken]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch teacher details
      const teacherRes = await fetch(`${API_BASE}/teachers/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (teacherRes.status === 401) {
        logout();
        navigate('/login/admin');
        return;
      }

      if (!teacherRes.ok) {
        throw new Error(`Teacher not found (${teacherRes.status})`);
      }

      const teacherData = await teacherRes.json();
      setTeacher(teacherData);

      // Fetch all groups to filter teacher's groups
      const groupsRes = await fetch(`${API_BASE}/groups/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        const allGroups: Group[] = groupsData.results || groupsData;
        
        // Filter groups where teacher_id matches or teacher matches
        const teacherGroups = allGroups.filter((g: any) => {
          return (
            g.teacher_id === Number(id) ||
            g.teacher === Number(id) ||
            g.teacher_detail?.id === Number(id) ||
            g.teacher_name?.toLowerCase().includes(teacherData.user_detail?.username?.toLowerCase() || '')
          );
        });

        setGroups(teacherGroups);
      }
    } catch (err) {
      console.error('Error loading teacher data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = () => {
    if (!teacher) return 'Teacher';
    const userObj = teacher.user_detail || teacher.user;
    if (userObj) {
      const full = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim();
      return full || userObj.username || `Teacher #${teacher.id}`;
    }
    return `Teacher #${teacher.id}`;
  };

  const getTeacherEmail = () => {
    if (!teacher) return '';
    const userObj = teacher.user_detail || teacher.user;
    return userObj?.email || 'No email provided';
  };

  if (loading) {
    return (
      <div className="teacher-detail loading-container">
        <div className="loading-spinner">Loading Teacher Profile...</div>
      </div>
    );
  }

  return (
    <div className="teacher-detail">
      <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
        ← Back to Dashboard
      </button>

      {error && <div className="error-message">⚠️ {error}</div>}

      {teacher && (
        <>
          {/* Header Card */}
          <div className="teacher-header-card glass-card">
            <div className="header-left">
              <div className="teacher-avatar">👨‍🏫</div>
              <div className="teacher-info">
                <h2>{getTeacherName()}</h2>
                <p className="email">✉️ {getTeacherEmail()}</p>
                <p className="specialization">
                  🎯 Specialization: <strong>{teacher.specialization || 'English Language'}</strong>
                </p>
              </div>
            </div>
            <div className="header-right">
              <span className={`badge ${teacher.is_active ? 'badge-success' : 'badge-danger'}`}>
                {teacher.is_active ? 'Active Teacher' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="teacher-stats-grid">
            <div className="stat-box glass-card">
              <span className="stat-icon">📚</span>
              <div className="stat-data">
                <span className="stat-num">{groups.length}</span>
                <span className="stat-lbl">Assigned Groups</span>
              </div>
            </div>

            <div className="stat-box glass-card">
              <span className="stat-icon">👥</span>
              <div className="stat-data">
                <span className="stat-num">
                  {groups.reduce((acc, g) => acc + (g.students_count || g.students?.length || 0), 0)}
                </span>
                <span className="stat-lbl">Total Students</span>
              </div>
            </div>

            <div className="stat-box glass-card">
              <span className="stat-icon">⭐</span>
              <div className="stat-data">
                <span className="stat-num">{teacher.is_active ? '100%' : '0%'}</span>
                <span className="stat-lbl">Active Status</span>
              </div>
            </div>
          </div>

          {/* Teacher's Groups Section */}
          <div className="section teacher-groups-section glass-card">
            <h3>Teacher's Groups ({groups.length})</h3>
            <p className="section-subtitle">Click on any group card to view students, lesson tables, and attendance.</p>

            {groups.length > 0 ? (
              <div className="groups-cards-grid">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="group-card-item"
                    onClick={() => navigate(`/admin/groups/${group.id}`)}
                  >
                    <div className="group-card-top">
                      <h4>{group.name}</h4>
                      <span className={`badge ${group.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="group-card-desc">
                      {group.description || 'Standard English language course group.'}
                    </p>

                    <div className="group-card-meta">
                      <span className="meta-badge">
                        🗓️ {group.schedule_type === 'odd' ? 'Mon/Wed/Fri' : group.schedule_type === 'even' ? 'Tue/Thu/Sat' : 'Regular'}
                      </span>
                      <span className="meta-price">
                        💳 {Number(group.price_per_month || 0).toLocaleString('uz-UZ')} сўм/mo
                      </span>
                    </div>

                    <div className="group-card-footer">
                      <span>👥 Students: {group.students_count || group.students?.length || 0} / {group.max_students}</span>
                      <button className="btn-purple view-group-btn">View Group ➜</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-groups-placeholder">
                <span className="empty-icon">📭</span>
                <p>No groups assigned to this teacher yet.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
