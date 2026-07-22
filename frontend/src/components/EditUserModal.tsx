import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CreateTeacherModal.css';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSuccess will receive the updated user object returned from the server
  // if the user was deleted the value will be null
  onSuccess: (updated?: any | null) => void;
  user: any;
  userType: 'teacher' | 'student' | 'admin';
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  user,
  userType,
  showToast
}) => {
  const { accessToken, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    specialization: '',
    bio: '',
    phone: '',
    date_of_birth: '',
    is_active: true,
  });

  useEffect(() => {
    if (user && isOpen) {
      // Prefer `user_detail` returned by the API (contains nested user fields)
      const userDetail = user.user_detail || user.user || {};
      setFormData({
        first_name: userDetail.first_name || user.first_name || '',
        last_name: userDetail.last_name || user.last_name || '',
        email: userDetail.email || user.email || '',
        specialization: user.specialization || '',
        bio: user.bio || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        is_active: (userDetail.is_active ?? user.is_active ?? true),
      });
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newVal: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: newVal
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = '';
      let payload: any = {};
      if (userType === 'teacher') {
        endpoint = `http://localhost:8000/api/v1/teachers/${user.id}/`;
        payload = {
          user: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            is_active: formData.is_active,
          },
          specialization: formData.specialization,
          bio: formData.bio,
          is_active: formData.is_active,
        };
      } else if (userType === 'student') {
        endpoint = `http://localhost:8000/api/v1/students/${user.id}/`;
        payload = {
          user: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            is_active: formData.is_active,
          },
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          is_active: formData.is_active,
        };
      } else if (userType === 'admin') {
        endpoint = `http://localhost:8000/api/v1/admins/${user.id}/`;
        payload = {
          user: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            is_active: formData.is_active,
          }
        };
      }

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.error || 'Failed to update user');
      }

      // server returns updated object — parse and forward to parent so it can update local state
      const updated = await response.json();
      onSuccess(updated);
      showToast && showToast('User updated successfully', 'success');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      setError(msg);
      showToast && showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const canDelete = role === 'superadmin';

  if (!isOpen) return null;

  let title = 'Edit User';
  if (userType === 'teacher') title = 'Edit Teacher';
  else if (userType === 'student') title = 'Edit Student';
  else if (userType === 'admin') title = 'Edit Admin';

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setLoading(true);
    setError('');
    try {
      let deleteEndpoint = '';
      if (userType === 'teacher') deleteEndpoint = `http://localhost:8000/api/v1/teachers/${user.id}/`;
      else if (userType === 'student') deleteEndpoint = `http://localhost:8000/api/v1/students/${user.id}/`;
      else if (userType === 'admin') deleteEndpoint = `http://localhost:8000/api/v1/admins/${user.id}/`;
      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Failed to delete user');
      }
      showToast && showToast('User deleted', 'success');
      onSuccess(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setError(msg);
      showToast && showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="is_active">Active</label>
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={!!formData.is_active}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {userType === 'teacher' && (
              <>
                <div className="form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <input
                    type="text"
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {userType === 'student' && (
              <>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date_of_birth">Date of Birth</label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-actions">
            {canDelete && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
