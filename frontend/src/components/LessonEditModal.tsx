import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  lesson: any;
  onClose: () => void;
  onSaved: (updated: any) => void;
}

const LessonEditModal: React.FC<Props> = ({ lesson, onClose, onSaved }) => {
  const { accessToken } = useAuth();
  const [topic, setTopic] = useState(lesson.topic || '');
  const [description, setDescription] = useState(lesson.description || '');
  const [homework, setHomework] = useState(lesson.homework || '');
  const [scheduledDate, setScheduledDate] = useState(lesson.scheduled_date || '');
  const [duration, setDuration] = useState(lesson.duration_minutes || 60);
  const [isCompleted, setIsCompleted] = useState(Boolean(lesson.is_completed));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        topic,
        description,
        homework,
        scheduled_date: scheduledDate,
        duration_minutes: Number(duration),
        is_completed: isCompleted,
      };

      const res = await fetch(`http://localhost:8000/api/v1/lessons/${lesson.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save lesson');
      }

      const data = await res.json();
      onSaved(data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 3000 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: 720, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Edit Lesson #{lesson.lesson_number}</h3>
          <button onClick={onClose} style={{ fontSize: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <label>
            Date/time
            <input type="datetime-local" value={scheduledDate ? scheduledDate.replace('Z', '') : ''} onChange={(e) => setScheduledDate(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </label>

          <label>
            Duration (minutes)
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ width: '100%', padding: 8 }} />
          </label>

          <label>
            Topic
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </label>

          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
          </label>

          <label>
            Homework
            <textarea value={homework} onChange={(e) => setHomework(e.target.value)} rows={3} style={{ width: '100%', padding: 8 }} />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} /> Mark as completed
          </label>

          {error && <div style={{ color: 'red' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 12px' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px' }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonEditModal;
