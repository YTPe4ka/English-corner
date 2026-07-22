import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './CreateTeacherModal.css';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any | null;
  onSuccess: (updated: any | null) => void; // null if deleted
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, group, onSuccess, showToast }) => {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    max_students: 20,
    price_per_month: 0,
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
      if (group) {
        setFormData({
          name: group.name || '',
          description: group.description || '',
          teacher: group.teacher || group.teacher?.id || '',
          start_date: group.start_date ? group.start_date.split('T')[0] : '',
          start_time: group.start_time || '',
          end_date: group.end_date ? group.end_date.split('T')[0] : '',
          end_time: group.end_time || '',
          max_students: group.max_students || 20,
          price_per_month: group.price_per_month || 0,
          is_active: group.is_active === undefined ? true : !!group.is_active,
        });
      }
    }
  }, [isOpen, group]);

  const loadTeachers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/teachers/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.results || data);
      }
    } catch (e) {
      console.error('Failed to load teachers');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/groups/${group.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          teacher: formData.teacher,
          start_date: formData.start_date,
          start_time: formData.start_time,
          end_date: formData.end_date,
          end_time: formData.end_time,
          max_students: formData.max_students,
          price_per_month: formData.price_per_month,
          is_active: formData.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.detail || data.error || 'Failed to update group';
        setError(message);
        showToast && showToast(message, 'error');
        return;
      }

      const updated = await res.json();
      showToast && showToast('Group updated', 'success');
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
      showToast && showToast('Failed to update group', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/groups/${group.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.detail || data.error || 'Failed to delete group';
        showToast && showToast(message, 'error');
        return;
      }
      showToast && showToast('Group deleted', 'success');
      onSuccess(null);
      onClose();
    } catch (err) {
      showToast && showToast('Failed to delete group', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Group</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Group Name *</label>
              <input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} disabled={loading} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="teacher">Teacher</label>
              <select id="teacher" name="teacher" value={formData.teacher} onChange={handleChange} disabled={loading}>
                <option value="">Select Teacher</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.user_detail?.first_name || t.user_detail?.username} {t.user_detail?.last_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="max_students">Max Students</label>
              <input type="number" id="max_students" name="max_students" value={formData.max_students} onChange={handleChange} min={1} disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input type="date" id="start_date" name="start_date" value={formData.start_date} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="end_date">End Date</label>
              <input type="date" id="end_date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time</label>
              <input type="time" id="start_time" name="start_time" value={formData.start_time} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="end_time">End Time</label>
              <input type="time" id="end_time" name="end_time" value={formData.end_time} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price_per_month">Price per Month</label>
              <input type="number" id="price_per_month" name="price_per_month" value={formData.price_per_month} onChange={handleChange} step="0.01" disabled={loading} />
            </div>

            <div className="form-group">
              <label htmlFor="is_active">Active</label>
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleCheckbox} disabled={loading} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={loading}>Delete</button>
            <div style={{marginLeft: 'auto'}}>
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
