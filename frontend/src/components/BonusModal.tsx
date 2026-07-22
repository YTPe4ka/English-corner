import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './BonusModal.css';

interface BonusModalProps {
  studentId: number;
  studentName: string;
  groupId: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

const BonusModal: React.FC<BonusModalProps> = ({
  studentId,
  studentName,
  groupId,
  onSuccess,
  onError,
  onClose,
}) => {
  const { accessToken } = useAuth();
  const [bonusCount, setBonusCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:8000/api/v1/student-lessons/add_bonus/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            group_id: groupId,
            bonus_count: bonusCount,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add bonus lessons');
      }

      onSuccess(
        `${bonusCount} bonus lesson${bonusCount > 1 ? 's' : ''} added successfully`
      );
      onClose();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'Failed to add bonus lessons'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bonus-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⭐ Add Bonus Lessons</h2>
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

            <div className="form-group">
              <label>Number of Bonus Lessons</label>
              <div className="bonus-input-group">
                <button
                  type="button"
                  className="btn-spin"
                  onClick={() => setBonusCount(Math.max(1, bonusCount - 1))}
                  disabled={bonusCount <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={bonusCount}
                  onChange={(e) => setBonusCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bonus-input"
                />
                <button
                  type="button"
                  className="btn-spin"
                  onClick={() => setBonusCount(Math.min(12, bonusCount + 1))}
                  disabled={bonusCount >= 12}
                >
                  +
                </button>
              </div>
            </div>

            <div className="bonus-preview">
              <div className="preview-icon">⭐</div>
              <div className="preview-text">
                <div className="preview-title">{bonusCount} Bonus Lesson{bonusCount > 1 ? 's' : ''}</div>
                <div className="preview-subtitle">Free lessons for {studentName}</div>
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
                className="btn-bonus"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Bonus'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BonusModal;
