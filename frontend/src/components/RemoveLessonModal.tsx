import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './RemoveLessonModal.css';

interface RemoveLessonModalProps {
  studentId: number;
  studentName: string;
  groupId: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

const RemoveLessonModal: React.FC<RemoveLessonModalProps> = ({
  studentId,
  studentName,
  groupId,
  onSuccess,
  onError,
  onClose,
}) => {
  const { accessToken } = useAuth();
  const [reason, setReason] = useState<string>('student_request');
  const [comment, setComment] = useState<string>('');
  const [lessonCount, setLessonCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const reasons = [
    { value: 'student_request', label: 'Student Request' },
    { value: 'admin_decision', label: 'Admin Decision' },
    { value: 'mistake', label: 'Mistake / Correction' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:8000/api/v1/student-lessons/remove_lesson/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            group_id: groupId,
            lesson_count: lessonCount,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to remove lesson');
      }

      onSuccess(`Lesson removal processed for ${studentName}`);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove lesson');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content remove-lesson-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>❌ Remove Lesson</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Student</label>
              <input
                type="text"
                value={studentName}
                disabled
                className="form-input"
              />
            </div>

            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                This action will remove the last lessons for this student. It can remove several lessons at once, but will never remove more lessons than are available.
              </div>
            </div>

            <div className="form-group">
              <label>Number of lessons to remove</label>
              <input
                type="number"
                min={1}
                value={lessonCount}
                onChange={(e) => setLessonCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Reason</label>
              <div className="reason-options">
                {reasons.map((r) => (
                  <label key={r.value} className="reason-option">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {reason === 'other' && (
              <div className="form-group">
                <label>Please specify reason</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter the reason..."
                  className="form-textarea"
                  rows={3}
                  required
                />
              </div>
            )}

            {(reason !== 'student_request' || comment) && (
              <div className="form-group">
                <label>Additional Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
            )}

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
                className="btn-remove"
                disabled={loading || lessonCount < 1}
              >
                {loading ? 'Processing...' : `Remove ${lessonCount} lesson${lessonCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RemoveLessonModal;
