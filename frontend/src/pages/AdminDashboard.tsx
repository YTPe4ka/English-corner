import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateTeacherModal } from '../components/CreateTeacherModal';
import { CreateStudentModal } from '../components/CreateStudentModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { CreateAdminModal } from '../components/CreateAdminModal';
import { EditUserModal } from '../components/EditUserModal';
import { EditGroupModal } from '../components/EditGroupModal';
import { UserGroupsModal } from '../components/UserGroupsModal';
import { Toasts } from '../components/Toast';
import { API_BASE_URL } from '../api/config';
import './AdminDashboard.css';

type Tab = 'dashboard' | 'users' | 'groups' | 'finance' | 'analytics';

export const AdminDashboard: React.FC = () => {
  const { user, accessToken, logout, role } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [adminStats, setAdminStats] = useState({
    total_students: 0,
    active_students: 0,
    total_teachers: 0,
    active_teachers: 0,
    total_groups: 0,
    active_groups: 0,
    total_payments: 0,
    pending_payments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financeRecords, setFinanceRecords] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState({
    total_amount: 0,
    total_operations: 0,
    payment_count: 0,
    bonus_count: 0,
    removed_count: 0,
    period_count: 0,
  });
  const [financeSearch, setFinanceSearch] = useState('');
  const [financeGroupFilter, setFinanceGroupFilter] = useState('');
  const [financeStudentFilter, setFinanceStudentFilter] = useState('');
  const [financeAdminFilter, setFinanceAdminFilter] = useState('');
  const [financeActionFilter, setFinanceActionFilter] = useState('');
  const [financeDateFrom, setFinanceDateFrom] = useState('');
  const [financeDateTo, setFinanceDateTo] = useState('');

  // Data lists
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupQuery, setGroupQuery] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [adminQuery, setAdminQuery] = useState('');
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // Modal states
  const [showCreateTeacherModal, setShowCreateTeacherModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingUserType, setEditingUserType] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [showUserGroupsModal, setShowUserGroupsModal] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      console.log('[AdminDashboard] No access token, redirecting to login');
      navigate('/login/admin');
      return;
    }

    console.log('[AdminDashboard] Access token present, loading data');
    loadData();
  }, [accessToken, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    loadFinanceHistory();
  }, [accessToken, financeSearch, financeGroupFilter, financeStudentFilter, financeAdminFilter, financeActionFilter, financeDateFrom, financeDateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch admin dashboard data
      const response = await fetch('http://localhost:8000/api/v1/admin/dashboard/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.log('[AdminDashboard] Got 401 Unauthorized, logging out');
        logout();
        navigate('/login/admin');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAdminStats(data || {});
      } else {
        const errText = await response.text();
        console.error('[AdminDashboard] Dashboard API error:', response.status, errText);
        throw new Error(`Failed to load admin data (${response.status})`);
      }

      // Load teachers
      const teachersRes = await fetch('http://localhost:8000/api/v1/teachers/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (teachersRes.status === 401) {
        logout();
        navigate('/login/admin');
        return;
      }
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        console.log('teachers API response', teachersData);
        setTeachers(teachersData.results || teachersData);
      }

      // Load students
      const studentsRes = await fetch(`${API_BASE_URL}/students/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (studentsRes.status === 401) {
        logout();
        navigate('/login/admin');
        return;
      }
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        console.log('students API response', studentsData);
        setStudents(studentsData.results || studentsData);
      }

      // Load groups
      const groupsRes = await fetch('http://localhost:8000/api/v1/groups/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (groupsRes.status === 401) {
        logout();
        navigate('/login/admin');
        return;
      }
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData.results || groupsData);
      }

      await loadFinanceHistory();

      // Load admins (only for superadmin)
      if (role === 'superadmin') {
        const adminsRes = await fetch('http://localhost:8000/api/v1/admins/', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (adminsRes.status === 401) {
          logout();
          navigate('/login/admin');
          return;
        }
        if (adminsRes.ok) {
          const adminsData = await adminsRes.json();
          console.log('admins API response', adminsData);
          setAdmins(adminsData.results || adminsData);
        }
      }
    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
      // Demo data as fallback
      setAdminStats({
        total_students: 156,
        active_students: 142,
        total_teachers: 12,
        active_teachers: 10,
        total_groups: 8,
        active_groups: 7,
        total_payments: 1250,
        pending_payments: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract name & email from user shapes returned by API
  const extractUserInfo = (entity: any) => {
    // entity may be: { user: { first_name, last_name, email } }
    // or { user: <id> } and user fields on root like user_email or user_username,
    // or first_name/last_name/email on root. We'll try multiple fallbacks.
    try {

      // Preferred: API returns `user_detail` with nested user fields
      if (entity?.user_detail && typeof entity.user_detail === 'object') {
        const fn = entity.user_detail.first_name || '';
        const ln = entity.user_detail.last_name || '';
        const email = entity.user_detail.email || '';
        const name = `${fn} ${ln}`.trim();
        return { name: name || (entity.user_detail.username || ''), email };
      }

      // Direct nested user object (older shape)
      if (entity?.user && typeof entity.user === 'object') {
        const fn = entity.user.first_name || '';
        const ln = entity.user.last_name || '';
        const email = entity.user.email || '';
        const name = `${fn} ${ln}`.trim();
        return { name: name || (entity.user.username || ''), email };
      }

      // Sometimes API returns user fields at root
      if (entity?.first_name || entity?.last_name || entity?.email) {
        const name = `${entity.first_name || ''} ${entity.last_name || ''}`.trim();
        return { name: name || entity.username || '', email: entity.email || '' };
      }

      // Sometimes API includes user_username or user_email
      if (entity?.user_username || entity?.user_email) {
        const name = entity.user_username || '';
        const email = entity.user_email || '';
        return { name, email };
      }

      // Fallback: entity.user might be an id; if API doesn't give more info,
      // show empty so UI shows 'Unknown' and console will help diagnose.
      return { name: '', email: '' };
    } catch (e) {
      return { name: '', email: '' };
    }
  };

  const loadFinanceHistory = async () => {
    const params = new URLSearchParams();
    if (financeSearch) params.set('search', financeSearch);
    if (financeGroupFilter) params.set('group_id', financeGroupFilter);
    if (financeStudentFilter) params.set('student_id', financeStudentFilter);
    if (financeAdminFilter) params.set('admin_id', financeAdminFilter);
    if (financeActionFilter) params.set('action_type', financeActionFilter);
    if (financeDateFrom) params.set('date_from', financeDateFrom);
    if (financeDateTo) params.set('date_to', financeDateTo);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/finance-history/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFinanceRecords(data.records || []);
        setFinanceSummary(data.summary || {
          total_amount: 0,
          total_operations: 0,
          payment_count: 0,
          bonus_count: 0,
          removed_count: 0,
          period_count: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load finance history', err);
    }
  };

  const patchActive = async (type: 'teacher' | 'student' | 'admin', id: number, newState: boolean) => {
    let url = '';
    if (type === 'teacher') url = `${API_BASE_URL}/teachers/${id}/`;
    else if (type === 'student') url = `${API_BASE_URL}/students/${id}/`;
    else if (type === 'admin') url = `${API_BASE_URL}/admins/${id}/`;
    try {
      // Optimistic update: apply change locally first and rollback on error
      if (type === 'teacher') {
        let rolledBack = false;
        setTeachers(prev => prev.map(t => (t.id === id ? { ...t, is_active: newState } : t)));
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: newState }),
        });
        if (!res.ok) {
          // rollback
          setTeachers(prev => prev.map(t => (t.id === id ? { ...t, is_active: !newState } : t)));
          rolledBack = true;
          const errText = await res.text();
          addToast('Failed to update teacher status', 'error');
          throw new Error(errText || 'Failed to update status');
        }
        const updated = await res.json();
        if (!rolledBack) setTeachers(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        addToast('Teacher status updated', 'success');
      } else {
        let rolledBack = false;
        setStudents(prev => prev.map(s => (s.id === id ? { ...s, is_active: newState } : s)));
        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: newState }),
        });
        if (!res.ok) {
          setStudents(prev => prev.map(s => (s.id === id ? { ...s, is_active: !newState } : s)));
          rolledBack = true;
          const errText = await res.text();
          addToast('Failed to update student status', 'error');
          throw new Error(errText || 'Failed to update status');
        }
        const updated = await res.json();
        if (!rolledBack) setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        addToast('Student status updated', 'success');
      }
    } catch (err) {
      if (!(err instanceof Error)) console.error(err);
    }
  };

  const handleToggleActive = (entity: any, type: 'teacher' | 'student' | 'admin') => {
    const isActive = !!entity.is_active;
    const confirmMsg = isActive
      ? 'Are you sure you want to deactivate this user?'
      : 'Activate this user?';
    if (!window.confirm(confirmMsg)) return;
    patchActive(type as any, entity.id, !isActive);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigateTo = (tab: Tab) => {
    setActiveTab(tab);
  };

  const openEditTeacher = (teacher: any) => {
    console.log('Editing teacher:', teacher);
    setEditingUser(teacher);
    setEditingUserType('teacher');
    setShowEditUserModal(true);
  };

  const openEditStudent = (student: any) => {
    console.log('Editing student:', student);
    setEditingUser(student);
    setEditingUserType('student');
    setShowEditUserModal(true);
  };

  const openEditAdmin = (admin: any) => {
    console.log('Editing admin:', admin);
    setEditingUser(admin);
    setEditingUserType('admin');
    setShowEditUserModal(true);
  };

  if (loading) {
    return (
      <div className="dashboard loading-dashboard">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>English Corner</h1>
          </div>
          
          <div className="header-actions">
            <div className="user-info">
              <span className="user-name">{user?.username || 'Admin'}</span>
              <span className={`role-badge ${role}`}>{role?.toUpperCase()}</span>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Bottom Navigation Bar (All Devices) */}
      <nav className="app-bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigateTo('dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span>Overview</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => navigateTo('users')}
        >
          <span className="nav-icon">👥</span>
          <span>Users</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => navigateTo('groups')}
        >
          <span className="nav-icon">📚</span>
          <span>Groups</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => navigateTo('finance')}
        >
          <span className="nav-icon">💰</span>
          <span>Finance</span>
        </button>
        <button
          className={`bottom-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => navigateTo('analytics')}
        >
          <span className="nav-icon">📈</span>
          <span>Stats</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="info-message">
            {error} (Demo data shown)
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <h2>Dashboard Overview</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">🎓</span>
                  <h3>Students</h3>
                </div>
                <div className="stat-number">{adminStats.total_students}</div>
                <p className="stat-description">{adminStats.active_students} active</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">👨‍🏫</span>
                  <h3>Teachers</h3>
                </div>
                <div className="stat-number">{adminStats.total_teachers}</div>
                <p className="stat-description">{adminStats.active_teachers} active</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">📚</span>
                  <h3>Groups</h3>
                </div>
                <div className="stat-number">{adminStats.total_groups}</div>
                <p className="stat-description">{adminStats.active_groups} active</p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">💵</span>
                  <h3>Revenue</h3>
                </div>
                <div className="stat-number">{adminStats.total_payments.toLocaleString('uz-UZ')} сўм</div>
                <p className="stat-description">{adminStats.pending_payments} pending</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card full-width">
              <h3>Quick Actions</h3>
              <div className="quick-actions">
                {role === 'superadmin' && (
                  <button 
                    className="action-button"
                    onClick={() => setShowCreateAdminModal(true)}
                  >
                    <span className="action-icon">👤</span>
                    <span>Create Admin</span>
                  </button>
                )}
                <button 
                  className="action-button"
                  onClick={() => setShowCreateTeacherModal(true)}
                >
                  <span className="action-icon">➕</span>
                  <span>Create Teacher</span>
                </button>
                <button 
                  className="action-button"
                  onClick={() => setShowCreateStudentModal(true)}
                >
                  <span className="action-icon">➕</span>
                  <span>Create Student</span>
                </button>
                <button 
                  className="action-button"
                  onClick={() => setShowCreateGroupModal(true)}
                >
                  <span className="action-icon">➕</span>
                  <span>Create Group</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>User Management</h2>
              <div className="section-actions">
                {role === 'superadmin' && (
                  <button 
                    className="btn-primary"
                    onClick={() => setShowCreateAdminModal(true)}
                  >
                    👤 Create Admin
                  </button>
                )}
                <button 
                  className="btn-primary"
                  onClick={() => setShowCreateTeacherModal(true)}
                >
                  ➕ Create Teacher
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowCreateStudentModal(true)}
                >
                  ➕ Create Student
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Teachers ({teachers.length})</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by name, email, or specialization..."
                  value={teacherQuery}
                  onChange={e => setTeacherQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              {teachers.length > 0 ? (
                <div className="table-container-teachers">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Specialization</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers
                        .filter(teacher => {
                          const info = extractUserInfo(teacher);
                          const searchStr = teacherQuery.toLowerCase();
                          return (
                            info.name.toLowerCase().includes(searchStr) ||
                            info.email.toLowerCase().includes(searchStr) ||
                            (teacher.specialization || '').toLowerCase().includes(searchStr)
                          );
                        })
                        .map((teacher: any) => {
                        const info = extractUserInfo(teacher);
                        const name = info.name || 'Unknown';
                        const email = info.email || '';
                        return (
                          <tr key={teacher.id}>
                            <td>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/admin/teachers/${teacher.id}`);
                                }}
                                style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}
                              >
                                {name} ➜
                              </a>
                            </td>
                            <td>{email || '-'}</td>
                            <td>{teacher.specialization || '-'}</td>
                            <td>
                              <span className={`badge ${teacher.is_active ? 'active' : 'inactive'}`}>
                                {teacher.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-toggle"
                                onClick={() => handleToggleActive(teacher, 'teacher')}
                                title={teacher.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {teacher.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button 
                                className="btn-edit"
                                onClick={() => openEditTeacher(teacher)}
                                title="Edit"
                              >
                                ✏️ Edit
                              </button>
                              {role === 'superadmin' && (
                                <button
                                  className="btn-danger"
                                  onClick={async () => {
                                    if (!window.confirm('Delete this teacher?')) return;
                                    try {
                                      const res = await fetch(`http://localhost:8000/api/v1/teachers/${teacher.id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
                                      if (!res.ok) throw new Error('Failed');
                                      setTeachers(prev => prev.filter(t => t.id !== teacher.id));
                                      addToast('Teacher deleted', 'success');
                                    } catch (e) {
                                      addToast('Failed to delete teacher', 'error');
                                    }
                                  }}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="placeholder">No teachers yet</p>
              )}
            </div>

            <div className="card">
              <h3>Students ({students.length})</h3>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={studentQuery}
                  onChange={e => setStudentQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              {students.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter(student => {
                          const info = extractUserInfo(student);
                          const searchStr = studentQuery.toLowerCase();
                          return (
                            info.name.toLowerCase().includes(searchStr) ||
                            info.email.toLowerCase().includes(searchStr) ||
                            (student.phone || '').toLowerCase().includes(searchStr)
                          );
                        })
                        .map((student: any) => {
                        const info = extractUserInfo(student);
                        const name = info.name || 'Unknown';
                        const email = info.email || '';
                        return (
                          <tr key={student.id}>
                            <td>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/admin/students/${student.id}`);
                                }}
                                style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}
                              >
                                {name} ➜
                              </a>
                            </td>
                            <td>{email || '-'}</td>
                            <td>{student.phone || '-'}</td>
                            <td>
                              <span className={`badge ${student.is_active ? 'active' : 'inactive'}`}>
                                {student.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-toggle"
                                onClick={() => handleToggleActive(student, 'student')}
                                title={student.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {student.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button 
                                className="btn-edit"
                                onClick={() => openEditStudent(student)}
                                title="Edit"
                              >
                                ✏️ Edit
                              </button>
                              {role === 'superadmin' && (
                                <button
                                  className="btn-danger"
                                  onClick={async () => {
                                    if (!window.confirm('Delete this student?')) return;
                                    try {
                                      const res = await fetch(`http://localhost:8000/api/v1/students/${student.id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
                                      if (!res.ok) throw new Error('Failed');
                                      setStudents(prev => prev.filter(s => s.id !== student.id));
                                      addToast('Student deleted', 'success');
                                    } catch (e) {
                                      addToast('Failed to delete student', 'error');
                                    }
                                  }}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="placeholder">No students yet</p>
              )}
            </div>

            {role === 'superadmin' && (
              <div className="card">
                <h3>Admins ({admins.length})</h3>
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={adminQuery}
                    onChange={e => setAdminQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                {admins.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins
                          .filter(admin => {
                            const info = extractUserInfo(admin);
                            const searchStr = adminQuery.toLowerCase();
                            return (
                              info.name.toLowerCase().includes(searchStr) ||
                              info.email.toLowerCase().includes(searchStr)
                            );
                          })
                          .map((admin: any) => {
                          const info = extractUserInfo(admin);
                          const name = info.name || 'Unknown';
                          const email = info.email || '';
                          return (
                            <tr key={admin.id}>
                              <td><strong>{name}</strong></td>
                              <td>{email || '-'}</td>
                              <td>
                                <span className={`badge ${admin.is_active ? 'active' : 'inactive'}`}>
                                  {admin.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn-toggle"
                                  onClick={() => handleToggleActive(admin, 'admin')}
                                  title={admin.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {admin.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button 
                                  className="btn-edit"
                                  onClick={() => openEditAdmin(admin)}
                                  title="Edit"
                                >
                                  ✏️ Edit
                                </button>
                                {role === 'superadmin' && (
                                  <button
                                    className="btn-danger"
                                    onClick={async () => {
                                      if (!window.confirm('Delete this admin?')) return;
                                      try {
                                        const res = await fetch(`http://localhost:8000/api/v1/admins/${admin.id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
                                        if (!res.ok) throw new Error('Failed');
                                        setAdmins(prev => prev.filter(a => a.id !== admin.id));
                                        addToast('Admin deleted', 'success');
                                      } catch (e) {
                                        addToast('Failed to delete admin', 'error');
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="placeholder">No admins yet</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Group Management</h2>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateGroupModal(true)}
              >
                ➕ Create Group
              </button>
            </div>

            <div className="card">
              <h3>Groups ({groups.length})</h3>
              <div style={{display: 'flex', gap: 8, marginBottom: 12}}>
                <input
                  type="search"
                  placeholder="Search groups by name..."
                  value={groupQuery}
                  onChange={e => setGroupQuery(e.target.value)}
                  style={{flex: 1, padding: '6px 8px'}}
                />
              </div>
              {groups.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Teacher</th>
                        <th>Max Students</th>
                        <th>Price/Month</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups
                        .filter(g => g.name.toLowerCase().includes(groupQuery.toLowerCase()))
                        .map((group) => (
                        <tr key={group.id}>
                          <td>
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); navigate(`/admin/groups/${group.id}`); }}
                              style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}
                            >
                              {group.name} ➜
                            </a>
                          </td>
                          <td>{group.teacher_name || group.teacher || '-'}</td>
                          <td>{group.max_students}</td>
                          <td>{group.price_per_month.toLocaleString('uz-UZ')} сўм</td>
                          <td>
                            <span className={`badge ${group.is_active ? 'active' : 'inactive'}`}>
                              {group.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-edit" onClick={() => { setEditingGroup(group); setShowEditGroupModal(true); }}>✏️ Edit</button>
                            <button
                              className="btn-toggle"
                              onClick={async () => {
                                const newState = !group.is_active;
                                if (!window.confirm(newState ? 'Activate group?' : 'Deactivate group?')) return;
                                // optimistic
                                setGroups(prev => prev.map(p => p.id === group.id ? { ...p, is_active: newState } : p));
                                try {
                                  const res = await fetch(`http://localhost:8000/api/v1/groups/${group.id}/`, {
                                    method: 'PATCH',
                                    headers: {
                                      Authorization: `Bearer ${accessToken}`,
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ is_active: newState })
                                  });
                                  if (!res.ok) {
                                    setGroups(prev => prev.map(p => p.id === group.id ? { ...p, is_active: group.is_active } : p));
                                    addToast('Failed to update group status', 'error');
                                  } else {
                                    const updated = await res.json();
                                    setGroups(prev => prev.map(p => p.id === updated.id ? updated : p));
                                    addToast('Group status updated', 'success');
                                  }
                                } catch (e) {
                                  setGroups(prev => prev.map(p => p.id === group.id ? { ...p, is_active: group.is_active } : p));
                                  addToast('Failed to update group status', 'error');
                                }
                              }}
                            >
                              {group.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="placeholder">No groups yet</p>
              )}
            </div>
          </div>
        )}

        {/* Finance Tab */}
        {activeTab === 'finance' && (
          <div className="tab-content">
            <h2>Finance & Payments</h2>

            <div className="card">
              <h3>Financial Summary</h3>
              <div className="finance-summary">
                <div className="finance-item">
                  <span>Total Amount:</span>
                  <strong>${financeSummary.total_amount.toFixed(2)}</strong>
                </div>
                <div className="finance-item">
                  <span>Payments:</span>
                  <strong>{financeSummary.payment_count}</strong>
                </div>
                <div className="finance-item">
                  <span>Bonuses:</span>
                  <strong>{financeSummary.bonus_count}</strong>
                </div>
                <div className="finance-item">
                  <span>Removed Lessons:</span>
                  <strong>{financeSummary.removed_count}</strong>
                </div>
                <div className="finance-item">
                  <span>Operations in Period:</span>
                  <strong>{financeSummary.period_count}</strong>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Transaction History</h3>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={financeSearch}
                  onChange={(e) => setFinanceSearch(e.target.value)}
                  placeholder="Search by student, group, admin, action, description"
                  className="search-input"
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select value={financeGroupFilter} onChange={(e) => setFinanceGroupFilter(e.target.value)} className="filter-select">
                    <option value="">All groups</option>
                    {groups.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <select value={financeStudentFilter} onChange={(e) => setFinanceStudentFilter(e.target.value)} className="filter-select">
                    <option value="">All students</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.user_detail?.first_name || s.user_detail?.username || s.username}</option>
                    ))}
                  </select>
                  <select value={financeAdminFilter} onChange={(e) => setFinanceAdminFilter(e.target.value)} className="filter-select">
                    <option value="">All admins</option>
                    {admins.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.user_detail?.first_name || a.user_detail?.username || a.username}</option>
                    ))}
                  </select>
                  <select value={financeActionFilter} onChange={(e) => setFinanceActionFilter(e.target.value)} className="filter-select">
                    <option value="">All actions</option>
                    <option value="payment">Payment</option>
                    <option value="lesson_payment">Lesson Payment</option>
                    <option value="bonus">Bonus</option>
                    <option value="remove_lesson">Remove Lesson</option>
                  </select>
                  <input type="date" value={financeDateFrom} onChange={(e) => setFinanceDateFrom(e.target.value)} className="filter-input" />
                  <input type="date" value={financeDateTo} onChange={(e) => setFinanceDateTo(e.target.value)} className="filter-input" />
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Group</th>
                      <th>Action</th>
                      <th>Lessons</th>
                      <th>Amount</th>
                      <th>Admin</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeRecords.map((record: any) => (
                      <tr key={record.id}>
                        <td>{record.date ? record.date.split('T')[0] : ''}</td>
                        <td><strong>{record.student_name || '-'}</strong></td>
                        <td>
                          {record.group_name ? (
                            <span className="badge badge-purple">{record.group_name}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${record.action_type === 'bonus' ? 'badge-success' : record.action_type === 'remove_lesson' ? 'badge-danger' : 'badge-purple'}`}>
                            {record.action_label || record.action_type}
                          </span>
                        </td>
                        <td>
                          <strong>{record.lessons_affected !== null && record.lessons_affected !== undefined ? record.lessons_affected : 1}</strong>
                        </td>
                        <td>
                          {record.amount !== null && record.amount !== undefined && Number(record.amount) > 0
                            ? `$${Number(record.amount).toFixed(2)}`
                            : record.action_type === 'bonus' ? 'Free (Bonus)' : '-'}
                        </td>
                        <td>{record.admin_name || '-'}</td>
                        <td>{record.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {financeRecords.length === 0 && (
                  <p className="placeholder">No finance records found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="tab-content">
            <h2>Analytics & Reports</h2>

            <div className="card">
              <h3>Key Metrics</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <h4>Student Enrollment</h4>
                  <p className="metric-value">{adminStats.total_students}</p>
                </div>
                <div className="metric">
                  <h4>Teacher Count</h4>
                  <p className="metric-value">{adminStats.total_teachers}</p>
                </div>
                <div className="metric">
                  <h4>Active Groups</h4>
                  <p className="metric-value">{adminStats.active_groups}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Charts & Graphs</h3>
              <p className="placeholder">Charts and graphs will be displayed here</p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateAdminModal
        isOpen={showCreateAdminModal}
        onClose={() => setShowCreateAdminModal(false)}
        onSuccess={loadData}
      />
      <CreateTeacherModal
        isOpen={showCreateTeacherModal}
        onClose={() => setShowCreateTeacherModal(false)}
        onSuccess={loadData}
      />
      <CreateStudentModal
        isOpen={showCreateStudentModal}
        onClose={() => setShowCreateStudentModal(false)}
        onSuccess={loadData}
      />
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSuccess={loadData}
      />
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => { setShowEditGroupModal(false); setEditingGroup(null); }}
        group={editingGroup}
        onSuccess={(updated) => {
          if (updated === null) {
            // deleted
            setGroups(prev => prev.filter(g => g.id !== (editingGroup?.id)));
          } else if (updated) {
            setGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)));
          } else {
            loadData();
          }
        }}
        showToast={(m, t) => addToast(m, t)}
      />
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setEditingUser(null);
        }}
        // onSuccess receives updated object; update or remove from local arrays
        onSuccess={(updated) => {
          if (updated === null) {
            // deleted
            if (editingUserType === 'teacher') {
              setTeachers(prev => prev.filter(t => t.id !== editingUser?.id));
            } else if (editingUserType === 'student') {
              setStudents(prev => prev.filter(s => s.id !== editingUser?.id));
            } else if (editingUserType === 'admin') {
              setAdmins(prev => prev.filter(a => a.id !== editingUser?.id));
            }
          } else if (updated) {
            if (editingUserType === 'teacher') {
              setTeachers(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            } else if (editingUserType === 'student') {
              setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
            } else if (editingUserType === 'admin') {
              setAdmins(prev => prev.map(a => (a.id === updated.id ? updated : a)));
            }
          } else {
            // fallback reload
            loadData();
          }
        }}
        // pass toast so modal can show success/error
        showToast={(msg, type) => addToast(msg, type)}
        user={editingUser}
        userType={editingUserType}
      />

      <UserGroupsModal
        isOpen={showUserGroupsModal}
        onClose={() => { setShowUserGroupsModal(false); setEditingUser(null); }}
        student={editingUser}
        showToast={(m, t) => addToast(m, t)}
      />
      <Toasts toasts={toasts} removeToast={removeToast} />
    </div>
  );
};
