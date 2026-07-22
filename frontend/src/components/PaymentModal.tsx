import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './PaymentModal.css';

interface PaymentModalProps {
  studentId: number;
  studentName: string;
  groupId: number;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  studentId,
  studentName,
  groupId,
  onSuccess,
  onClose,
}) => {
  const { accessToken } = useAuth();
  const [selectedLessons, setSelectedLessons] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [studentBalance, setStudentBalance] = useState<number>(0);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [lessonsRemaining, setLessonsRemaining] = useState<number | null>(null);
  const [removedLessonsCount, setRemovedLessonsCount] = useState<number>(0);
  const [activeLessonsCount, setActiveLessonsCount] = useState<number>(0);
  const [maxLessons, setMaxLessons] = useState<number>(12);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadGroupAndStudent();
  }, []);

  const loadGroupAndStudent = async () => {
    try {
      const [groupRes, studentRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/groups/${groupId}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`http://localhost:8000/api/v1/students/${studentId}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (groupRes.ok) {
        const data = await groupRes.json();
        setGroupData(data);
        calculatePrices(parseFloat(data.price_per_month) || 0);
      }

      if (studentRes.ok) {
        const data = await studentRes.json();
        setStudentBalance(parseFloat(data.balance) || 0);
      }

      const lessonRes = await fetch(
        `http://localhost:8000/api/v1/lesson-payments/student_lesson_payments/?student_id=${studentId}&group_id=${groupId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (lessonRes.ok) {
        const lessonData = await lessonRes.json();
        setLessonsRemaining(Number(lessonData.lessons_remaining || 0));
        setRemovedLessonsCount(Number(lessonData.removed_lessons_count || 0));
        setActiveLessonsCount(Number(lessonData.active_lessons_count || 0));
        setMaxLessons(Number(lessonData.max_lessons || 12));

        const availableSlots = Math.max(0, Number(lessonData.max_lessons || 12) - Number(lessonData.active_lessons_count || 0));
        if (lessonData.removed_lessons_count) {
          setSelectedLessons(Math.min(availableSlots, Number(lessonData.removed_lessons_count) || 1) || 1);
        } else {
          setSelectedLessons(Math.min(selectedLessons, Math.max(1, availableSlots)));
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load group and student information');
    }
  };

  const calculatePrices = (basePrice: number) => {
    const numericBasePrice = Number(basePrice) || 0;
    const prices = {
      12: numericBasePrice,
      6: numericBasePrice / 2,
      1: Math.ceil((numericBasePrice / 12) * 100) / 100, // Round up
    };
    setPriceBreakdown(prices);
  };

  const getPrice = (count: number): number => {
    if (!priceBreakdown) return 0;
    if (count === 12) return priceBreakdown[12];
    if (count === 6) return priceBreakdown[6];
    const basePrice = priceBreakdown[12] || 0;
    return Math.ceil((basePrice * count) / 12 * 100) / 100;
  };

  const currentPrice = getPrice(selectedLessons);
  const canAfford = studentBalance >= currentPrice;
  const availableLessonSlots = Math.max(0, maxLessons - activeLessonsCount);
  const maxAllowedPayment = removedLessonsCount > 0
    ? Math.min(removedLessonsCount, availableLessonSlots)
    : availableLessonSlots;
  const hasActiveLessonLimitReached = activeLessonsCount >= maxLessons;
  const canPay = canAfford && !paymentSuccess && maxAllowedPayment > 0 && selectedLessons > 0;

  const handleLessonCountChange = (count: 12 | 6 | 1) => {
    const allowedCount = Math.min(count, Math.max(0, maxLessons - activeLessonsCount));
    setSelectedLessons(allowedCount > 0 ? allowedCount : 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const availableSlots = Math.max(0, maxLessons - activeLessonsCount);
    if (activeLessonsCount >= maxLessons) {
      setError(`Student already has ${maxLessons} active lessons. Payment is blocked.`);
      return;
    }

    if (removedLessonsCount > 0 && selectedLessons > removedLessonsCount) {
      setError(`You can only repay up to ${removedLessonsCount} removed lesson(s).`);
      return;
    }

    if (selectedLessons > availableSlots) {
      setError(`This payment would exceed the 12-lesson limit. You can only add ${availableSlots} more lesson(s).`);
      return;
    }

    if (!canAfford) {
      setError(`Insufficient balance. You need $${(currentPrice - studentBalance).toFixed(2)} more.`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        'http://localhost:8000/api/v1/lesson-payments/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            student_id: studentId,
            group_id: groupId,
            lesson_count: selectedLessons,
            payment_type: 'cash',
            payment_date: new Date().toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const shortfall = result.shortfall ? `Shortfall: $${parseFloat(result.shortfall).toFixed(2)}. ` : '';
        throw new Error(result.error || `${shortfall}Failed to process payment`);
      }

      const message = `Payment of $${currentPrice.toFixed(2)} for ${selectedLessons} lesson(s) processed successfully. New balance: $${result.new_balance}`;
      setPaymentSuccess(true);
      setSuccessMessage(message);
      setLessonsRemaining(selectedLessons);
      onSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (!priceBreakdown || !groupData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>💳 Pay for Lessons</h2>
            <button className="modal-close" onClick={onClose}>{paymentSuccess ? '✅' : '✕'}</button>
          </div>
          <div className="modal-body">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Pay for Lessons</h2>
          <button className="modal-close" onClick={onClose}>{paymentSuccess ? '✅' : '✕'}</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

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
              <label>Current Balance: <strong>${studentBalance.toFixed(2)}</strong></label>
            </div>

            <div className="form-group">
              <label>Remaining paid lessons:</label>
              <div className="amount-display">
                {lessonsRemaining === null ? 'Loading...' : lessonsRemaining}
              </div>
            </div>

            <div className="form-group">
              <label>Group: <strong>{groupData.name}</strong></label>
              <p style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                Monthly fee: ${parseFloat(groupData.price_per_month || 0).toFixed(2)}
              </p>
            </div>

            <div className="form-group">
              <label>Select number of lessons</label>
              {removedLessonsCount > 0 ? (
                <div className="removed-lessons-input">
                  <p style={{ marginBottom: '8px', color: '#333' }}>
                    {`There are ${removedLessonsCount} removed lesson(s). You can repay up to ${removedLessonsCount}.`}
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, Math.min(removedLessonsCount, maxAllowedPayment))}
                    value={selectedLessons}
                    onChange={(e) => setSelectedLessons(Math.max(1, Math.min(Math.min(removedLessonsCount, maxAllowedPayment), Number(e.target.value))))}
                    disabled={loading || paymentSuccess || maxAllowedPayment <= 0}
                    className="form-input"
                  />
                  <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                    {`Price per lesson: $${getPrice(1).toFixed(2)}`}
                  </p>
                </div>
              ) : (
                <div className="lesson-options">
                  <button
                    type="button"
                    className={`lesson-btn ${selectedLessons === 12 ? 'active' : ''} ${studentBalance < getPrice(12) || 12 > maxAllowedPayment || paymentSuccess ? 'disabled' : ''}`}
                    onClick={() => handleLessonCountChange(12)}
                    disabled={loading || studentBalance < getPrice(12) || 12 > maxAllowedPayment || paymentSuccess}
                  >
                    <span className="lesson-count">12</span>
                    <span className="lesson-label">Lessons (1 month)</span>
                    <span className="lesson-price">${getPrice(12).toFixed(2)}</span>
                    {studentBalance < getPrice(12) && <span className="insufficient">Insufficient</span>}
                  </button>
                  <button
                    type="button"
                    className={`lesson-btn ${selectedLessons === 6 ? 'active' : ''} ${studentBalance < getPrice(6) || 6 > maxAllowedPayment || paymentSuccess ? 'disabled' : ''}`}
                    onClick={() => handleLessonCountChange(6)}
                    disabled={loading || studentBalance < getPrice(6) || 6 > maxAllowedPayment || paymentSuccess}
                  >
                    <span className="lesson-count">6</span>
                    <span className="lesson-label">Lessons (2 weeks)</span>
                    <span className="lesson-price">${getPrice(6).toFixed(2)}</span>
                    {studentBalance < getPrice(6) && <span className="insufficient">Insufficient</span>}
                  </button>
                  <button
                    type="button"
                    className={`lesson-btn ${selectedLessons === 1 ? 'active' : ''} ${studentBalance < getPrice(1) || 1 > maxAllowedPayment || paymentSuccess ? 'disabled' : ''}`}
                    onClick={() => handleLessonCountChange(1)}
                    disabled={loading || studentBalance < getPrice(1) || 1 > maxAllowedPayment || paymentSuccess}
                  >
                    <span className="lesson-count">1</span>
                    <span className="lesson-label">Lesson (1 week)</span>
                    <span className="lesson-price">${getPrice(1).toFixed(2)}</span>
                    {studentBalance < getPrice(1) && <span className="insufficient">Insufficient</span>}
                  </button>
                </div>
              )}
            </div>

            {hasActiveLessonLimitReached && (
              <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '8px' }}>
                This student already has {activeLessonsCount}/{maxLessons} active lessons. No further lesson payments are allowed.
              </div>
            )}
            {!hasActiveLessonLimitReached && maxAllowedPayment <= 0 && (
              <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '8px' }}>
                Payment unavailable due to lesson limits.
              </div>
            )}
            {removedLessonsCount > 0 && maxAllowedPayment > 0 && (
              <div style={{ color: '#666', fontSize: '0.9em', marginTop: '8px' }}>
                You can repay up to {maxAllowedPayment} removed lesson(s). Current active lessons: {activeLessonsCount}/{maxLessons}.
              </div>
            )}
            {!hasActiveLessonLimitReached && removedLessonsCount === 0 && maxAllowedPayment > 0 && (
              <div style={{ color: '#666', fontSize: '0.9em', marginTop: '8px' }}>
                You may add up to {maxAllowedPayment} more paid lesson(s) while observing the 12-lesson cap.
              </div>
            )}

            <div className="form-group">
              <label>Amount to charge</label>
              <div className="amount-display">
                ${currentPrice.toFixed(2)}
              </div>
              {!canAfford && (
                <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '8px' }}>
                  You need ${(currentPrice - studentBalance).toFixed(2)} more to complete this purchase.
                </div>
              )}
              {canAfford && maxAllowedPayment > 0 && (
                <div style={{ color: '#388e3c', fontSize: '0.9em', marginTop: '8px' }}>
                  Balance after purchase: ${(studentBalance - currentPrice).toFixed(2)}
                </div>
              )}
              {maxAllowedPayment <= 0 && !hasActiveLessonLimitReached && (
                <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '8px' }}>
                  This payment cannot be completed because of current lesson limits.
                </div>
              )}
              {paymentSuccess && (
                <div style={{ color: '#388e3c', fontSize: '0.95em', marginTop: '8px' }}>
                  ✅ {successMessage}
                </div>
              )}
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
                disabled={loading || !canPay}
              >
                {loading ? 'Processing...' : paymentSuccess ? '✅ Paid' : `Pay $${currentPrice.toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
