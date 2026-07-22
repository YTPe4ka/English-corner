import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './CreateTeacherModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserGroupsModal: React.FC<Props> = ({ isOpen, onClose, student, showToast }) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groupMemberships, setGroupMemberships] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [performances, setPerformances] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [topupAmount, setTopupAmount] = useState<number | string>('');

  useEffect(() => {
    if (isOpen && student) {
      loadMemberships();
      loadAllGroups();
      loadStudentDetail();
    }
  }, [isOpen, student]);

  const loadStudentDetail = async () => {
    if (!student) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/students/${student.id}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStudentDetail(data);
    } catch (e) {
      console.error('failed to load student detail');
    }
  };

  useEffect(() => {
    if (selectedGroup && student) {
      loadGroupDetails(selectedGroup);
    } else {
      setPayments([]);
      setPerformances([]);
      setAttendances([]);
    }
  }, [selectedGroup, student]);

  const loadMemberships = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/students/${student.id}/groups/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load memberships');
      const data = await res.json();
      setGroupMemberships(data || []);
      // default select first
      if ((data || []).length > 0) {
        const first = (data || [])[0];
        const grp = first.group_detail || (first.group ? (typeof first.group === 'object' ? first.group : { id: first.group }) : null);
        setSelectedGroup(grp);
      }
    } catch (e) {
      showToast && showToast('Failed to load memberships', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAllGroups = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/groups/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAllGroups(data.results || data);
    } catch (e) {
      console.error('failed groups');
    }
  };

  const loadGroupDetails = async (group: any) => {
    if (!student || !group) return;
    const groupId = group?.id ?? group;
    if (!groupId) return;
    // payments
    try {
      const p = await fetch(`http://localhost:8000/api/v1/payments/student_payments/?student_id=${student.id}&group_id=${groupId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (p.ok) setPayments(await p.json());
    } catch (e) {}

    try {
      const perf = await fetch(`http://localhost:8000/api/v1/performance/student_performance/?student_id=${student.id}&group_id=${groupId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (perf.ok) {
        const data = await perf.json();
        setPerformances(data.records || data);
      }
    } catch (e) {}

    try {
      const a = await fetch(`http://localhost:8000/api/v1/attendance/student_attendance/?student_id=${student.id}&group_id=${groupId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (a.ok) {
        const data = await a.json();
        setAttendances(data.records || data);
      }
    } catch (e) {}
  };

  const handleAddToGroup = async (groupId: number) => {
    if (!student) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/groups/${groupId}/add_student/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast && showToast(data.detail || data.message || 'Failed to add', 'error');
        return;
      }
      showToast && showToast('Student added to group', 'success');
      loadMemberships();
      loadStudentDetail();
    } catch (e) {
      showToast && showToast('Failed to add student to group', 'error');
    }
  };

  const handleRemoveFromGroup = async (groupId: number) => {
    if (!student) return;
    if (!window.confirm('Remove student from this group?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/groups/${groupId}/remove_student/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast && showToast(data.detail || data.message || 'Failed to remove', 'error');
        return;
      }
      showToast && showToast('Student removed from group', 'success');
      loadMemberships();
      setSelectedGroup(null);
      loadStudentDetail();
    } catch (e) {
      showToast && showToast('Failed to remove student from group', 'error');
    }
  };

  const handleTopUp = async () => {
    if (!student) return;
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return showToast && showToast('Enter valid amount', 'error');
    try {
      const res = await fetch('http://localhost:8000/api/v1/payments/add_balance/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, amount })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast && showToast(data.detail || data.message || 'Top-up failed', 'error');
        return;
      }
      await res.json();
      showToast && showToast('Balance updated', 'success');
      setTopupAmount('');
      loadStudentDetail();
      // reload payments for selected group
      if (selectedGroup) loadGroupDetails(selectedGroup);
    } catch (e) {
      showToast && showToast('Top-up failed', 'error');
    }
  };

  const handleChargeForGroup = async () => {
    if (!student || !selectedGroup) return;
    const groupId = selectedGroup?.id ?? selectedGroup;
    try {
      const res = await fetch('http://localhost:8000/api/v1/payments/charge_group/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, group_id: groupId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast && showToast(data.detail || data.message || 'Charge failed', 'error');
      } else {
        showToast && showToast(data.message || 'Charge processed', 'success');
      }
      loadMemberships();
      loadStudentDetail();
      if (selectedGroup) loadGroupDetails(selectedGroup);
    } catch (e) {
      showToast && showToast('Charge failed', 'error');
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 900}}>
        <div className="modal-header">
          <h2>{student.user_detail ? (student.user_detail.first_name || student.user_detail.username) : student.user || 'Student'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{display: 'flex', gap: 16}}>
          <div style={{width: 320}}>
            <h4>Groups</h4>
            <div style={{marginBottom:8}}>
              <strong>Balance:</strong> ${studentDetail?.balance ?? student.balance ?? 0}
            </div>
            <div style={{maxHeight: 360, overflow: 'auto'}}>
              {loading ? <p>Loading...</p> : (
                <ul style={{listStyle: 'none', padding: 0}}>
                  {groupMemberships.map(gs => (
                    <li key={gs.id} style={{padding: 8, borderBottom: '1px solid #eee'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div>
                          <a href="#" onClick={(e) => { e.preventDefault(); const grp = gs.group_detail || (gs.group ? (typeof gs.group === 'object' ? gs.group : { id: gs.group }) : null); setSelectedGroup(grp); }}>{(gs.group_detail && gs.group_detail.name) || (gs.group && (typeof gs.group === 'object' ? gs.group.name : `Group ${gs.group}`)) || gs.group}</a>
                          <div style={{fontSize: 12, color: '#666'}}>{gs.joined_at ? `Joined: ${gs.joined_at.split('T')[0]}` : ''}</div>
                        </div>
                        <div>
                          <button className="btn-danger" onClick={() => handleRemoveFromGroup(gs.group || gs.group_detail?.id)}>Remove</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <h4 style={{marginTop: 12}}>Add to group</h4>
            <div style={{display: 'flex', gap: 8}}>
              <select id="add-group" style={{flex: 1}}>
                <option value="">Select group</option>
                {allGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button onClick={() => {
                const sel = (document.getElementById('add-group') as HTMLSelectElement).value;
                if (sel) handleAddToGroup(Number(sel));
              }}>Add</button>
            </div>
          </div>

          <div style={{flex: 1}}>
            <h4>Group Details</h4>
            {selectedGroup ? (
              <div>
                <p><strong>{selectedGroup.name}</strong></p>
                <p>{selectedGroup.description}</p>
                <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
                  <input placeholder="Top-up amount" value={topupAmount as any} onChange={e => setTopupAmount(e.target.value)} style={{width:120}} />
                  <button onClick={handleTopUp}>Top-up</button>
                  <button onClick={handleChargeForGroup}>Charge for month</button>
                </div>

                <div className="card">
                  <h5>Payments</h5>
                  {payments.length > 0 ? (
                    <table className="data-table">
                      <thead>
                        <tr><th>Amount</th><th>Operation</th><th>Description</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {payments.map((p:any) => (
                          <tr key={p.id}>
                            <td>${p.amount}</td>
                            <td>{p.payment_type === 'enrollment' ? 'Top-up' : p.payment_type === 'monthly' ? 'Monthly charge' : p.payment_type === 'discount' ? 'Discount' : p.payment_type}</td>
                            <td>{p.description || '-'}</td>
                            <td>{p.payment_date?.split('T')[0]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="placeholder">No payments</p>}
                </div>

                <div className="card">
                  <h5>Performance</h5>
                  {performances.length > 0 ? (
                    <table className="data-table">
                      <thead><tr><th>Subject</th><th>Grade</th><th>Date</th><th>By</th></tr></thead>
                      <tbody>
                        {performances.map((r:any) => (
                          <tr key={r.id}><td>{r.subject}</td><td>{r.grade}</td><td>{r.assessment_date?.split('T')[0]}</td><td>{r.teacher_detail?.user_detail?.first_name || r.teacher_detail?.user_detail?.username}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="placeholder">No assessments</p>}
                </div>

                <div className="card">
                  <h5>Attendance</h5>
                  {attendances.length > 0 ? (
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Present</th></tr></thead>
                      <tbody>
                        {attendances.map((a:any) => (
                          <tr key={a.id}><td>{a.class_date?.split('T')[0]}</td><td>{a.is_present ? 'Yes' : 'No'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="placeholder">No attendance records</p>}
                </div>

                <div className="card">
                  <h5>Homeworks</h5>
                  <p className="placeholder">Homework model not implemented yet.</p>
                </div>

              </div>
            ) : (
              <p className="placeholder">Select a group to view details</p>
            )}
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
