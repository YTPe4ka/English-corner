import React, { useEffect } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type?: ToastType;
}

interface ToastsProps {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

export const Toasts: React.FC<ToastsProps> = ({ toasts, removeToast }) => {
  useEffect(() => {
    const timers = toasts.map(t =>
      setTimeout(() => removeToast(t.id), 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div className="toasts-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type || 'info'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};
