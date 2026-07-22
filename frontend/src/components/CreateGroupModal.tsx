import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CreateTeacherModal.css';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Функция для вычисления конца курса (12 уроков)
const calculateEndDate = (startDate: string, scheduleType: 'odd' | 'even'): string => {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  let lessonsGenerated = 0;
  let currentDate = new Date(start);
  
  while (lessonsGenerated < 12) {
    const weekday = currentDate.getDay();
    const isOddDay = weekday === 1 || weekday === 3 || weekday === 5; // Пн, Ср, Пт
    const isEvenDay = weekday === 2 || weekday === 4 || weekday === 6; // Вт, Чт, Сб
    
    if ((scheduleType === 'odd' && isOddDay) || (scheduleType === 'even' && isEvenDay)) {
      lessonsGenerated++;
    }
    
    if (lessonsGenerated < 12) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return currentDate.toISOString().split('T')[0];
};

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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
    end_time: '',
    max_students: 20,
    price_per_month: 0,
    schedule_type: 'odd',
  });
  
  // Вычисляем конец курса на основе start_date и schedule_type
  const calculatedEndDate = calculateEndDate(formData.start_date, formData.schedule_type as 'odd' | 'even');

  useEffect(() => {
    if (isOpen) {
      loadTeachers();
    }
  }, [isOpen]);

  const loadTeachers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/teachers/', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.results || data);
      }
    } catch (err) {
      console.error('Failed to load teachers');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_students' || name === 'price_per_month' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Добавляем вычисленный end_date перед отправкой
      const dataToSend = {
        ...formData,
        end_date: calculatedEndDate,
      };

      const response = await fetch('http://localhost:8000/api/v1/groups/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.error || 'Failed to create group');
      }

      setFormData({
        name: '',
        description: '',
        teacher: '',
        start_date: '',
        start_time: '',
        end_time: '',
        max_students: 20,
        price_per_month: 0,
        schedule_type: 'odd',
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Group</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Group Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="English A1"
                required
                disabled={loading}
              />
            </div>
            
          </div>

          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Group description..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="teacher">Teacher *</label>
              <select
                id="teacher"
                name="teacher"
                value={formData.teacher}
                onChange={(e) => {
                  handleChange(e);
                  console.log('Selected teacher:', e.target.value);
                }}
                required
                disabled={loading}
              >
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user_detail?.first_name || teacher.user_detail?.username} {teacher.user_detail?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="max_students">Max Students</label>
              <input
                type="number"
                id="max_students"
                name="max_students"
                value={formData.max_students}
                onChange={handleChange}
                min="1"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date *</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="schedule_type">Lesson Schedule *</label>
              <select
                id="schedule_type"
                name="schedule_type"
                value={formData.schedule_type}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value="odd">Odd Days (Mon, Wed, Fri)</option>
                <option value="even">Even Days (Tue, Thu, Sat)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Start Time</label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="end_time">End Time</label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price_per_month">Price per Month</label>
              <input
                type="number"
                id="price_per_month"
                name="price_per_month"
                value={formData.price_per_month}
                onChange={handleChange}
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="max_students">Max Students</label>
              <input
                type="number"
                id="max_students"
                name="max_students"
                value={formData.max_students}
                onChange={handleChange}
                min="1"
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
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
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
