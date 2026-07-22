import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Toasts } from '../components/Toast';
import './StudentDetail.css';

const API_BASE = 'http://localhost:8000/api/v1';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Student {
  id: number;
  user_detail?: User;
  user?: User;
  balance: string | number;
  payments?: Payment[];
  lesson_payments?: LessonPayment[];
  action_logs?: ActionLog[];
  financial_summary?: FinancialSummary;
  lesson_summary?: LessonSummary;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  price_per_month: string | number;
  max_students: number;
  teacher_id: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  teacher_detail?: { id: number; user_detail?: User };
}

interface GroupStudent {
  id: number;
  student: number;
  group: number | Group;
  group_detail?: Group;
  is_active: boolean;
  joined_at?: string;
  left_at?: string;
}

interface Payment {
  id: number;
  student: number;
  group?: number;
  amount: string | number;
  payment_type: string;
  description: string;
  created_at?: string;
  payment_date?: string;
  processed_by_detail?: { user_detail?: User };
}

interface LessonPayment {
  id: number;
  student: number;
  group: number;
  lessons_purchased: number;
  total_amount: string | number;
  price_per_lesson: string | number;
  lessons_remaining: number;
  status: string;
  payment_date?: string;
}

interface ActionLog {
  id: number;
  student: number;
  action_type: string;
  lessons_affected?: number;
  amount?: string | number;
  description?: string;
  created_at?: string;
  admin_detail?: { user_detail?: User };
}

interface FinancialSummary {
  total_topups: number;
  total_monthly_payments: number;
  total_lesson_spent: number;
  total_discounts: number;
  total_paid: number;
  current_balance: number;
}

interface LessonSummary {
  lessons_remaining: number;
  bonus_lessons: number;
  removed_lessons: number;
  paid_lessons: number;
  unpaid_lessons: number;
  future_lessons: number;
  lesson_balance: number;
}

interface Performance {
  id: number;
  student: number;
  group: number;
  score: number;
  remarks?: string;
  recorded_at?: string;
}

interface Attendance {
  id: number;
  student: number;
  group: number;
  is_present: boolean;
  recorded_at?: string;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminStudentPage = location.pathname.startsWith('/admin/students');
  const { accessToken, logout, role } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<GroupStudent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);

  const [topupAmount, setTopupAmount] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });

  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      const [studentRes, groupsRes, paymentsRes, perfRes, attRes, allGroupsRes] = await Promise.all([
        fetch(`${API_BASE}/students/${id}/`, { headers: { ...headers, 'Content-Type': 'application/json' } }),
        fetch(`${API_BASE}/students/${id}/groups/`, { headers }),
        fetch(`${API_BASE}/payments/student_payments/?student_id=${id}`, { headers }),
        fetch(`${API_BASE}/performance/student_performance/?student_id=${id}`, { headers }),
        fetch(`${API_BASE}/attendance/student_attendance/?student_id=${id}`, { headers }),
        fetch(`${API_BASE}/groups/`, { headers }),
      ]);

      if (studentRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (studentRes.ok) {
        const s = await studentRes.json();
        setStudent(s);
        setEditForm({
          first_name: s.user_detail?.first_name || s.user?.first_name || '',
          last_name: s.user_detail?.last_name || s.user?.last_name || '',
          email: s.user_detail?.email || s.user?.email || '',
        });
      }

      if (groupsRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (groupsRes.ok) {
        const g = await groupsRes.json();
        setGroups(Array.isArray(g) ? g : []);
      }

      if (paymentsRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (paymentsRes.ok) {
        const p = await paymentsRes.json();
        setPayments(Array.isArray(p) ? p : p.records || []);
      }

      if (perfRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (perfRes.ok) {
        const prf = await perfRes.json();
        setPerformance(Array.isArray(prf) ? prf : prf.records || []);
      }

      if (attRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (attRes.ok) {
        const att = await attRes.json();
        setAttendance(Array.isArray(att) ? att : att.records || []);
      }

      if (allGroupsRes.status === 401) {
        logout();
        navigate(role === 'admin' || role === 'superadmin' ? '/login/admin' : `/login/${role}`);
        return;
      }

      if (allGroupsRes.ok) {
        const allG = await allGroupsRes.json();
        setAllGroups(Array.isArray(allG) ? allG : []);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    addToast(message, type);
  };

  const handleTopup = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      showToast('Введите сумму', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/payments/add_balance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({
          student_id: id,
          amount: topupAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStudent(prev => prev ? { ...prev, balance: data.new_balance } : null);
        setTopupAmount('');
        showToast('Баланс пополнен', 'success');
      } else {
        showToast('Ошибка пополнения', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка при пополнении', 'error');
    }
  };

  const handleChargeGroup = async (groupId: number) => {
    try {
      const res = await fetch(`${API_BASE}/payments/charge_group/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({
          student_id: id,
          group_id: groupId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStudent(prev => prev ? { ...prev, balance: data.new_balance || data.current_balance } : null);
        await loadData();
        if (data.removed_from_group) {
          showToast('Недостаточно средств - удален из группы', 'error');
        } else {
          showToast('Платеж обработан', 'success');
        }
      } else {
        // show server message when possible
        showToast(data.error || 'Ошибка списания', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка при списании', 'error');
    }
  };

  const handleAddGroup = async (groupId: number) => {
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/add_student/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ student_id: id }),
      });

      if (res.ok) {
        showToast('Студент добавлен в группу', 'success');
        loadData();
        setShowAddGroup(false);
      } else {
        showToast('Ошибка добавления', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка при добавлении', 'error');
    }
  };

  const handleRemoveGroup = async (groupId: number) => {
    if (!confirm('Удалить студента из группы?')) return;

    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/remove_student/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ student_id: id }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Студент удален из группы', 'success');
        loadData();
      } else {
        showToast(data.error || 'Ошибка удаления', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка при удалении', 'error');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({
          user_detail: editForm,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setStudent(updated);
        setEditMode(false);
        showToast('Данные обновлены', 'success');
      } else {
        showToast('Ошибка сохранения', 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showToast('Ошибка при сохранении', 'error');
    }
  };

  if (loading) return <div className="student-detail"><div className="loading-spinner">Loading Student Profile...</div></div>;
  if (!student) return <div className="student-detail"><p className="placeholder">Student not found</p></div>;

  const userInfo = student.user_detail || student.user;

  return (
    <div className="student-detail">
      <button onClick={() => navigate('/admin/dashboard')} className="back-btn">
        ← Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="student-header-card glass-card">
        <div className="student-header-left">
          <div className="student-avatar">🎓</div>
          <div className="student-info-main">
            <h2>
              {userInfo?.first_name || userInfo?.username || 'Student'} {userInfo?.last_name || ''}
            </h2>
            <p className="student-email">✉️ {userInfo?.email || 'No email registered'}</p>
            <span className="student-id-badge">ID: #{student.id}</span>
          </div>
        </div>

        <div className="student-balance-hero">
          <span className="balance-label">Current Balance</span>
          <span className="balance-value">${Number(student.balance || 0).toFixed(2)}</span>
          <button
            onClick={() => setEditMode(!editMode)}
            className="chip-btn"
            style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            {editMode ? '✖ Close Edit' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="student-stats-grid">
        <div className="student-stat-card glass-card">
          <span className="stat-icon">💳</span>
          <div className="stat-details">
            <span className="stat-number">${Number(student.balance || 0).toFixed(2)}</span>
            <span className="stat-label">Available Balance</span>
          </div>
        </div>

        <div className="student-stat-card glass-card">
          <span className="stat-icon">📚</span>
          <div className="stat-details">
            <span className="stat-number">{groups.length}</span>
            <span className="stat-label">Enrolled Groups</span>
          </div>
        </div>

        <div className="student-stat-card glass-card">
          <span className="stat-icon">⚡</span>
          <div className="stat-details">
            <span className="stat-number">{student.lesson_summary?.lesson_balance ?? 0}</span>
            <span className="stat-label">Lessons Remaining</span>
          </div>
        </div>

        <div className="student-stat-card glass-card">
          <span className="stat-icon">🎁</span>
          <div className="stat-details">
            <span className="stat-number">{student.lesson_summary?.bonus_lessons ?? 0}</span>
            <span className="stat-label">Bonus Lessons</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {editMode && (
        <div className="edit-profile-card glass-card">
          <h3>✏️ Edit Student Profile</h3>
          <div className="edit-grid">
            <input
              type="text"
              placeholder="First Name"
              value={editForm.first_name}
              onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
              className="search-input"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={editForm.last_name}
              onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
              className="search-input"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={editForm.email}
              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              className="search-input"
            />
          </div>
          <button onClick={handleSaveEdit} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem' }}>
            💾 Save Changes
          </button>
        </div>
      )}

      {/* Topup Balance Section */}
      <div className="topup-card glass-card">
        <h3>⚡ Quick Top-Up Balance</h3>
        <div className="preset-chips">
          <button className="chip-btn" onClick={() => setTopupAmount('10')}>+$10</button>
          <button className="chip-btn" onClick={() => setTopupAmount('25')}>+$25</button>
          <button className="chip-btn" onClick={() => setTopupAmount('50')}>+$50</button>
          <button className="chip-btn" onClick={() => setTopupAmount('100')}>+$100</button>
          <button className="chip-btn" onClick={() => setTopupAmount('500')}>+$500</button>
        </div>
        <div className="topup-form-group">
          <input
            type="number"
            placeholder="Enter custom amount ($)"
            value={topupAmount}
            onChange={e => setTopupAmount(e.target.value)}
            step="0.01"
            className="search-input"
          />
          <button onClick={handleTopup} className="btn-topup-action">
            💳 Top Up Balance Now
          </button>
        </div>
      </div>

      {/* Enrolled Groups Section */}
      <div className="groups-section glass-card">
        <div className="section-header-row">
          <h3>📚 Enrolled Groups ({groups.length})</h3>
          <button onClick={() => setShowAddGroup(!showAddGroup)} className="chip-btn">
            {showAddGroup ? '✖ Close Form' : '➕ Add to Group'}
          </button>
        </div>

        {showAddGroup && (
          <div className="add-group-form" style={{ marginBottom: '1.5rem' }}>
            <select
              value={selectedGroupId || ''}
              onChange={e => setSelectedGroupId(Number(e.target.value))}
              className="filter-select"
            >
              <option value="">Select a Group to Enroll</option>
              {allGroups
                .filter(g => !groups.find(gs => (typeof gs.group === 'object' ? gs.group.id : gs.group) === g.id))
                .map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} (${g.price_per_month}/mo)
                  </option>
                ))}
            </select>
            <button
              className="btn-primary"
              onClick={() => {
                if (selectedGroupId) {
                  handleAddGroup(selectedGroupId);
                  setSelectedGroupId(null);
                }
              }}
            >
              Confirm Enrollment
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="empty-groups-placeholder">
            <span className="empty-icon">📭</span>
            <p>Student is not enrolled in any groups yet.</p>
          </div>
        ) : (
          <div className="student-groups-grid">
            {groups.map(gs => {
              const grp = typeof gs.group === 'object' ? gs.group : gs.group_detail;
              const groupId = typeof grp?.id === 'number' ? grp.id : Number(gs.group);
              return (
                <div key={gs.id} className="student-group-card">
                  <div className="group-card-header">
                    <h4>{grp?.name || `Group #${groupId}`}</h4>
                    <span className={`badge ${gs.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {gs.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="group-card-price">
                    💳 Price: <strong>${grp?.price_per_month || 0}/mo</strong>
                  </p>

                  <div className="group-card-actions">
                    {grp?.id && (
                      <button
                        onClick={() => navigate(`/admin/groups/${grp.id}`)}
                        className="btn-card-action primary"
                      >
                        View Group ➜
                      </button>
                    )}

                    {!isAdminStudentPage && (
                      <button
                        onClick={() => handleChargeGroup(groupId)}
                        className="btn-card-action charge"
                        disabled={Boolean(!grp?.is_active || (grp?.end_date && new Date(grp.end_date) < new Date()))}
                      >
                        Charge Month
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveGroup(groupId)}
                      className="btn-card-action danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="section glass-card" style={{ marginBottom: '2rem' }}>
        <h3>💳 Payment History</h3>
        {payments.length === 0 ? (
          <p className="placeholder">No payment history found</p>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.payment_date ? p.payment_date.split('T')[0] : '-'}</td>
                    <td><strong>${Number(p.amount || 0).toFixed(2)}</strong></td>
                    <td><span className="badge badge-purple">{p.payment_type}</span></td>
                    <td>
                      {p.description}
                      {p.processed_by_detail?.user_detail && (
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          Processed by: {p.processed_by_detail.user_detail.first_name || p.processed_by_detail.user_detail.username}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Logs Section */}
      <div className="section glass-card" style={{ marginBottom: '2rem' }}>
        <h3>📋 Operation & Lesson Logs</h3>
        {student.action_logs && student.action_logs.length > 0 ? (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Lessons Affected</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {student.action_logs.map(log => (
                  <tr key={log.id}>
                    <td>{log.created_at ? log.created_at.split('T')[0] : '-'}</td>
                    <td>
                      <span className={`badge ${log.action_type === 'bonus' ? 'badge-success' : log.action_type === 'remove_lesson' ? 'badge-danger' : 'badge-purple'}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td><strong>{log.lessons_affected ?? '-'}</strong></td>
                    <td>{log.amount !== null && log.amount !== undefined ? `$${Number(log.amount).toFixed(2)}` : '-'}</td>
                    <td>{log.description || '-'}</td>
                    <td>{log.admin_detail?.user_detail?.first_name || log.admin_detail?.user_detail?.username || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="placeholder">No operation history found</p>
        )}
      </div>

      {/* Performance Section */}
      <div className="section glass-card" style={{ marginBottom: '2rem' }}>
        <h3>📊 Performance & Grades</h3>
        {performance.length === 0 ? (
          <p className="placeholder">No performance records found</p>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Group ID</th>
                  <th>Score</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {performance.map(p => (
                  <tr key={p.id}>
                    <td>Group #{p.group}</td>
                    <td><strong>{p.score}</strong></td>
                    <td>{p.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attendance Section */}
      <div className="section glass-card" style={{ marginBottom: '2rem' }}>
        <h3>📅 Attendance Log</h3>
        {attendance.length === 0 ? (
          <p className="placeholder">No attendance records found</p>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Group ID</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map(a => (
                  <tr key={a.id}>
                    <td>Group #{a.group}</td>
                    <td>
                      <span className={`badge ${a.is_present ? 'badge-success' : 'badge-danger'}`}>
                        {a.is_present ? '✓ Present' : '✗ Absent'}
                      </span>
                    </td>
                    <td>{a.recorded_at ? a.recorded_at.split('T')[0] : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toasts toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
