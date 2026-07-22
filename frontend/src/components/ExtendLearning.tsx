import React, { useState } from 'react';
import './ExtendLearning.css';

interface ExtendLearningProps {
  studentBalance: number;
  lessonsRemaining: number;
  pricePerLesson: number;
  groupId: number;
  studentId: number;
  onExtendSuccess: (newBalance: number, newLessonsRemaining: number) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

type LessonOption = 1 | 6 | 12;

const ExtendLearning: React.FC<ExtendLearningProps> = ({
  studentBalance,
  lessonsRemaining,
  pricePerLesson,
  groupId,
  studentId,
  onExtendSuccess,
  onError,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<LessonOption>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lessonOptions: LessonOption[] = [1, 6, 12];
  const totalCost = selectedLessons * pricePerLesson;
  const canAfford = studentBalance >= totalCost;

  const handleExtend = async () => {
    if (!canAfford) {
      const errorMsg = `Insufficient balance. You need $${totalCost.toFixed(2)} but only have $${studentBalance.toFixed(2)}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/v1/lesson-payments/extend_learning/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            group_id: groupId,
            lessons_to_add: selectedLessons,
          }),
        }
      );

      if (response.status === 402) {
        const errorMsg = 'Insufficient balance to purchase these lessons.';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.detail || 'Failed to extend learning';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      const data = await response.json();
      const newBalance = data.new_balance || studentBalance - totalCost;
      const newLessons = data.lessons_remaining || lessonsRemaining + selectedLessons;

      onExtendSuccess(newBalance, newLessons);
      onSuccess?.(
        `Successfully added ${selectedLessons} lesson${selectedLessons !== 1 ? 's' : ''}! New balance: $${newBalance.toFixed(2)}`
      );

      setIsOpen(false);
      setSelectedLessons(1);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn-extend-learning"
        onClick={() => setIsOpen(true)}
        title={`You have ${lessonsRemaining} lessons remaining`}
      >
        <span className="lessons-badge">{lessonsRemaining}</span>
        Extend Learning
      </button>

      {isOpen && (
        <div className="extend-modal-overlay" onClick={() => !loading && setIsOpen(false)}>
          <div className="extend-modal-content" onClick={e => e.stopPropagation()}>
            <div className="extend-modal-header">
              <h3>Extend Your Learning</h3>
              <button
                className="extend-modal-close"
                onClick={() => !loading && setIsOpen(false)}
                disabled={loading}
              >
                ×
              </button>
            </div>

            <div className="extend-modal-body">
              {error && <div className="extend-error-message">{error}</div>}

              <div className="extend-info-grid">
                <div className="extend-info-box">
                  <div className="extend-info-label">Your Balance</div>
                  <div className="extend-info-value">${studentBalance.toFixed(2)}</div>
                </div>
                <div className="extend-info-box">
                  <div className="extend-info-label">Lessons Remaining</div>
                  <div className="extend-info-value">{lessonsRemaining}</div>
                </div>
                <div className="extend-info-box">
                  <div className="extend-info-label">Price per Lesson</div>
                  <div className="extend-info-value">${pricePerLesson.toFixed(2)}</div>
                </div>
              </div>

              <div className="extend-lessons-selector">
                <label htmlFor="lessons-select">Select Lessons to Add *</label>
                <select
                  id="lessons-select"
                  value={selectedLessons}
                  onChange={(e) => setSelectedLessons(parseInt(e.target.value) as LessonOption)}
                  disabled={loading}
                >
                  {lessonOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} lesson{option !== 1 ? 's' : ''} - ${(option * pricePerLesson).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="extend-summary">
                <div className="extend-summary-row">
                  <span>{selectedLessons} lesson{selectedLessons !== 1 ? 's' : ''}</span>
                  <span className="extend-summary-price">${totalCost.toFixed(2)}</span>
                </div>
                {totalCost <= studentBalance && (
                  <div className="extend-summary-row" style={{ marginTop: '8px' }}>
                    <span>New Balance</span>
                    <span className="extend-summary-price" style={{ color: '#059669' }}>
                      ${(studentBalance - totalCost).toFixed(2)}
                    </span>
                  </div>
                )}
                {!canAfford && (
                  <div className="extend-error-inline">
                    Need ${totalCost.toFixed(2)}, but only have ${studentBalance.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            <div className="extend-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleExtend}
                disabled={loading || !canAfford}
              >
                {loading ? 'Processing...' : `Add ${selectedLessons} Lesson${selectedLessons !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExtendLearning;
