import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LessonsTable from '../components/LessonsTable';
import StudentLessonTable from '../components/StudentLessonTable';
import PaymentModal from '../components/PaymentModal';
import BonusModal from '../components/BonusModal';
import RemoveLessonModal from '../components/RemoveLessonModal';
import ExtendLearning from '../components/ExtendLearning';
import { Toasts } from '../components/Toast';
import { API_BASE_URL } from '../api/config';
import LessonDetailModal from '../components/LessonDetailModal';
import LessonEditModal from '../components/LessonEditModal';
import './AdminDashboard.css';
import './GroupDetail.css';

export const GroupDetail: React.FC = () => {
  const { id } = useParams();
  const { accessToken, user, role } = useAuth();
  const navigate = useNavigate();

  const isAdmin = role === 'admin' || role === 'superadmin';
  const isStudent = role === 'student';

  const [group, setGroup] = useState<any | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: 'success' | 'error' | 'info' }>>([]);
  const [toastId, setToastId] = useState(0);
  const [studentBalance, setStudentBalance] = useState(0);
  const [lessonsRemaining, setLessonsRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState<'lessons' | 'lesson-table'>('lesson-table');
  const [activeModal, setActiveModal] = useState<'payment' | 'bonus' | 'remove_lesson' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [lessonTableRefreshKey, setLessonTableRefreshKey] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = toastId + 1;
    setToastId(id);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (!id) return;
    loadGroup();
  }, [id]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load group');
      const data = await res.json();
      setGroup(data);
      
      // Load lessons and lesson payments
      await Promise.all([
        loadLessons(id!),
        loadLessonPayments(id!),
        isAdmin ? loadAttendance(id!) : Promise.resolve()
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async (groupId: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/lessons/by_group/?group_id=${groupId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
      }
    } catch (e) {
      console.error('Failed to load lessons:', e);
    }
  };

  const loadAttendance = async (groupId: string) => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/?group_id=${groupId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.error('Failed to load attendance:', e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const toggleAttendance = async (attendanceId: number, isPresent: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/${attendanceId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_present: isPresent }),
      });
      if (!res.ok) throw new Error('Failed to update attendance');
      addToast('Attendance updated', 'success');
      if (group?.id) loadAttendance(String(group.id));
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update attendance', 'error');
    }
  };

  const loadLessonPayments = async (groupId: string) => {
    try {
      if (role !== 'student') return;
      
      const res = await fetch(
        `${API_BASE_URL}/lesson-payments/student_lesson_payments/?student_id=${user?.id}&group_id=${groupId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.lessons_remaining !== undefined) {
          setLessonsRemaining(data.lessons_remaining);
        }
      }
    } catch (e) {
      console.error('Failed to load lesson payments:', e);
    }
  };

  if (loading) return <div className="group-detail-container"><div className="loading-spinner">Loading group details...</div></div>;
  if (error) return <div className="group-detail-container"><p className="placeholder">Error: {error}</p></div>;
  if (!group) return <div className="group-detail-container"><p className="placeholder">Group not found</p></div>;

  return (
    <div className="group-detail-container">
      <Toasts toasts={toasts} removeToast={removeToast} />
      
      <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
        ← Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="group-header-card glass-card">
        <div className="group-header-left">
          <div className="group-icon-avatar">👥</div>
          <div className="group-info-main">
            <h2>{group.name}</h2>
            <div className="group-meta-row">
              <span className="badge badge-purple">
                🗓️ {group.schedule_type === 'odd' ? 'Mon/Wed/Fri (Odd)' : group.schedule_type === 'even' ? 'Tue/Thu/Sat (Even)' : 'Regular'}
              </span>
              {(group.start_time || group.end_time) && (
                <span className="badge badge-purple">
                  ⏰ {group.start_time || '—'}{group.start_time && group.end_time ? ' – ' : ''}{group.end_time || ''}
                </span>
              )}
              <span className={`badge ${group.is_active ? 'badge-success' : 'badge-danger'}`}>
                {group.is_active ? 'Active Group' : 'Inactive'}
              </span>
            </div>
            <p style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.92rem' }}>
              👨‍🏫 Teacher: <strong>{group.teacher_detail ? (group.teacher_detail.user_detail?.first_name || group.teacher_detail.user_detail?.username) : (group.teacher || '-')}</strong>
            </p>
          </div>
        </div>

        <div className="group-price-hero">
          <span className="price-label">Monthly Fee</span>
          <span className="price-val">${Number(group.price_per_month || 0).toLocaleString()}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.85, display: 'block', marginTop: '0.25rem' }}>
            Capacity: {group.max_students} students
          </span>
        </div>
      </div>

      {/* Lessons Section with Glass Tabs */}
      <div className="section glass-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <div className="glass-tabs-header">
          <button
            className={`glass-tab-btn ${activeTab === 'lesson-table' ? 'active' : ''}`}
            onClick={() => setActiveTab('lesson-table')}
          >
            📊 Interactive Lesson Table (Student × Lesson)
          </button>
          <button
            className={`glass-tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
            onClick={() => setActiveTab('lessons')}
          >
            📅 Scheduled Lessons ({lessons.length}/12)
          </button>
        </div>

        {activeTab === 'lesson-table' && isAdmin && (
          <StudentLessonTable 
            key={lessonTableRefreshKey}
            groupId={group.id}
            onActionRequested={(action, studentId, studentName) => {
              const student = group.students?.find((s: any) => s.student_detail?.id === studentId);
              const name = studentName || student?.student_detail?.user_detail?.first_name || student?.student_detail?.user_detail?.username || 'Student';
              
              setSelectedStudent({ id: studentId, name });
              setActiveModal(action === 'payment' ? 'payment' : action === 'bonus' ? 'bonus' : 'remove_lesson');
            }}
          />
        )}

        {activeTab === 'lessons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              {isStudent && group.price_per_lesson && (
                <ExtendLearning
                  studentBalance={studentBalance}
                  lessonsRemaining={lessonsRemaining}
                  pricePerLesson={group.price_per_lesson}
                  groupId={group.id}
                  studentId={user?.id || 0}
                  onExtendSuccess={(newBalance, newLessons) => {
                    setStudentBalance(newBalance);
                    setLessonsRemaining(newLessons);
                    addToast(`Successfully extended! New balance: $${newBalance.toFixed(2)}`, 'success');
                    loadLessons(id!);
                  }}
                  onError={(error) => {
                    addToast(error, 'error');
                  }}
                  onSuccess={(message) => {
                    addToast(message, 'success');
                  }}
                />
              )}
            </div>
            <LessonsTable
              lessons={lessons}
              isAdmin={isAdmin}
              onLessonClick={(lesson) => setSelectedLesson(lesson)}
              onEditLesson={(lesson) => setEditingLesson(lesson)}
              onDeleteLesson={(lessonId) => {
                console.log('Delete lesson:', lessonId);
              }}
            />
          </div>
        )}
      </div>

      {/* Payments History */}
      <div className="section glass-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <h3>💳 Group Payments</h3>
        {group.payments && group.payments.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Operation</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {group.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td><strong>{p.student_detail ? (p.student_detail.user_detail?.first_name || p.student_detail.user_detail?.username) : p.student}</strong></td>
                    <td><strong>${p.amount}</strong></td>
                    <td><span className="badge badge-purple">{p.payment_type === 'enrollment' ? 'Top-up' : p.payment_type === 'monthly' ? 'Monthly charge' : p.payment_type === 'discount' ? 'Discount' : p.payment_type}</span></td>
                    <td>{p.description || '-'}</td>
                    <td>{p.payment_date ? p.payment_date.split('T')[0] : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="placeholder">No group payments logged yet</p>
        )}
      </div>

      {/* Group Action Journal */}
      <div className="section glass-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <h3>📋 Group Action Journal</h3>
        {group.action_logs && group.action_logs.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Lessons</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {group.action_logs.map((log: any) => (
                  <tr key={log.id}>
                    <td>{log.created_at ? log.created_at.split('T')[0] : ''}</td>
                    <td><strong>{log.student_detail ? (log.student_detail.user_detail?.first_name || log.student_detail.user_detail?.username) : log.student}</strong></td>
                    <td>
                      <span className={`badge ${log.action_type === 'bonus' ? 'badge-success' : log.action_type === 'remove_lesson' ? 'badge-danger' : 'badge-purple'}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td><strong>{log.lessons_affected || '-'}</strong></td>
                    <td>{log.amount !== undefined && log.amount !== null ? `$${log.amount}` : '-'}</td>
                    <td>{log.description || '-'}</td>
                    <td>{log.admin_detail?.user_detail?.first_name || log.admin_detail?.user_detail?.username || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="placeholder">No group action history yet</p>
        )}
      </div>

      <div className="card">
        <h3>Performance Records</h3>
        {group.performance_records && group.performance_records.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Grade</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {group.performance_records.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.student_detail ? (r.student_detail.user_detail?.first_name || r.student_detail.user_detail?.username) : r.student}</td>
                    <td>{r.subject}</td>
                    <td>{r.grade}</td>
                    <td>{r.assessment_date ? r.assessment_date.split('T')[0] : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="placeholder">No performance records yet</p>
        )}
      </div>

      <div className="card">
        <h3>Attendance</h3>
        {attendanceLoading ? (
          <p className="placeholder">Loading attendance...</p>
        ) : attendance.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a: any) => (
                  <tr key={a.id}>
                    <td>{a.student_detail ? (a.student_detail.user_detail?.first_name || a.student_detail.user_detail?.username) : a.student}</td>
                    <td>{a.class_date ? a.class_date.split('T')[0] : ''}</td>
                    <td>
                      {isAdmin ? (
                        <select
                          value={a.is_present ? 'present' : 'absent'}
                          onChange={(e) => toggleAttendance(a.id, e.target.value === 'present')}
                          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                          <option value="present">✅ Present</option>
                          <option value="absent">❌ Absent</option>
                        </select>
                      ) : (a.is_present ? '✅ Present' : '❌ Absent')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="placeholder">No attendance records yet</p>
        )}
      </div>

      {/* Modals */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          groupName={group.name}
          groupTime={group.start_time && group.end_time ? `${group.start_time}–${group.end_time}` : undefined}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {editingLesson && (
        <LessonEditModal
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={() => {
            addToast('Lesson updated', 'success');
            setEditingLesson(null);
            if (group?.id) loadLessons(String(group.id));
            if (isAdmin && group?.id) loadAttendance(String(group.id));
          }}
        />
      )}

      {activeModal === 'payment' && selectedStudent && (
        <PaymentModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          groupId={group.id}
          onSuccess={(message) => {
            addToast(message, 'success');
            setLessonTableRefreshKey(prev => prev + 1); // Refresh table
            loadGroup();
          }}
          onClose={() => {
            setActiveModal(null);
            setSelectedStudent(null);
          }}
        />
      )}

      {activeModal === 'bonus' && selectedStudent && (
        <BonusModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          groupId={group.id}
          onSuccess={(message) => {
            addToast(message, 'success');
            setActiveModal(null);
            setLessonTableRefreshKey(prev => prev + 1); // Refresh table
            loadGroup();
            setSelectedStudent(null);
          }}
          onError={(message) => {
            addToast(message, 'error');
          }}
          onClose={() => {
            setActiveModal(null);
            setSelectedStudent(null);
          }}
        />
      )}

      {activeModal === 'remove_lesson' && selectedStudent && (
        <RemoveLessonModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          groupId={group.id}
          onSuccess={(message) => {
            addToast(message, 'success');
            setActiveModal(null);
            setLessonTableRefreshKey(prev => prev + 1); // Refresh table
            loadGroup();
            setSelectedStudent(null);
          }}
          onError={(message) => {
            addToast(message, 'error');
          }}
          onClose={() => {
            setActiveModal(null);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};
