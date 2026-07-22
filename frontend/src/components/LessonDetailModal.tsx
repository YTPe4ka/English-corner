import React from 'react';

interface LessonDetailModalProps {
  lesson: any;
  groupName: string;
  groupTime?: string;
  onClose: () => void;
}

const LessonDetailModal: React.FC<LessonDetailModalProps> = ({ lesson, groupName, groupTime, onClose }) => {
  const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return value;
    }
  };

  const formatTime = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 3000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          width: '100%',
          maxWidth: '640px',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#667eea', fontWeight: 700, marginBottom: '4px' }}>Lesson Detail</div>
            <h3 style={{ margin: 0, fontSize: '24px' }}>Lesson #{lesson.lesson_number}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: '10px', color: '#333' }}>
          <p style={{ margin: 0 }}><strong>Group:</strong> {groupName}</p>
          <p style={{ margin: 0 }}><strong>Date:</strong> {formatDate(lesson.scheduled_date)}</p>
          <p style={{ margin: 0 }}><strong>Time:</strong> {formatTime(lesson.scheduled_date)}{lesson.duration_minutes ? ` • ${lesson.duration_minutes} min` : ''}</p>
          {groupTime ? <p style={{ margin: 0 }}><strong>Group schedule:</strong> {groupTime}</p> : null}
          <p style={{ margin: 0 }}><strong>Status:</strong> {lesson.is_completed ? 'Completed' : 'Pending'}</p>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Topic</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{lesson.topic || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Description</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{lesson.description || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Homework</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{lesson.homework || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonDetailModal;
