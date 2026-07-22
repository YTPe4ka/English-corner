import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './StudentLessonTable.css';

interface Lesson {
  id: number;
  number: number;
  date: string;
  time: string;
}

interface StudentRow {
  id: number;
  name: string;
  email: string;
  lessons_status: string[];
  is_expired: boolean;
}

interface TableData {
  group: {
    id: number;
    name: string;
    schedule_type: string;
  };
  lessons: Lesson[];
  students: StudentRow[];
}

interface StudentLessonTableProps {
  groupId: number;
  onActionRequested?: (action: string, studentId: number, studentName?: string) => void;
}

const StudentLessonTable: React.FC<StudentLessonTableProps> = ({ 
  groupId, 
  onActionRequested 
}) => {
  const { accessToken } = useAuth();
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStudentActions, setActiveStudentActions] = useState<number | null>(null);

  useEffect(() => {
    loadTableData();
  }, [groupId]);

  const loadTableData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/groups/${groupId}/lesson-table/`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to load lesson table');
      const data = await res.json();
      setTableData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lesson table');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string): { icon: string; label: string; className: string } => {
    switch (status) {
      case 'paid':
        return { icon: '✅', label: 'Paid', className: 'paid' };
      case 'bonus':
        return { icon: '⭐', label: 'Bonus', className: 'bonus' };
      case 'unpaid':
        return { icon: '🔴', label: 'Unpaid', className: 'unpaid' };
      case 'removed':
        return { icon: '❌', label: 'Removed', className: 'removed' };
      case 'future':
        return { icon: '⚪', label: 'Future', className: 'future' };
      default:
        return { icon: '❓', label: 'Unknown', className: 'unknown' };
    }
  };

  const handleStudentActionClick = (studentId: number) => {
    setActiveStudentActions(activeStudentActions === studentId ? null : studentId);
  };

  const handlePaymentClick = (studentId: number, studentName: string) => {
    onActionRequested?.('payment', studentId, studentName);
    setActiveStudentActions(null);
  };

  const handleBonusClick = (studentId: number, studentName: string) => {
    onActionRequested?.('bonus', studentId, studentName);
    setActiveStudentActions(null);
  };

  const handleRemoveLessonClick = (studentId: number, studentName: string) => {
    onActionRequested?.('remove_lesson', studentId, studentName);
    setActiveStudentActions(null);
  };

  if (loading) {
    return <div className="lesson-table-loading">Loading lesson table...</div>;
  }

  if (error) {
    return <div className="lesson-table-error">Error: {error}</div>;
  }

  if (!tableData || tableData.lessons.length === 0) {
    return <div className="lesson-table-empty">No lessons scheduled yet</div>;
  }

  return (
    <div className="student-lesson-table-wrapper">
      <div className="lesson-table-container">
        <table className="student-lesson-table">
          <thead>
            <tr>
              <th className="student-name-col">Student</th>
              {tableData.lessons.map((lesson) => (
                <th key={lesson.id} className="lesson-date-col" title={`${lesson.date} ${lesson.time}`}>
                  <div className="lesson-header">
                    <span className="lesson-number">L{lesson.number}</span>
                    <span className="lesson-date">{lesson.date}</span>
                  </div>
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.students.map((student) => (
              <React.Fragment key={student.id}>
                <tr className={`student-row ${student.is_expired ? 'expired' : ''}`}>
                  <td className="student-name-cell">
                    <div className="student-info">
                      <div className="student-name">{student.name}</div>
                      <div className="student-email">{student.email}</div>
                    </div>
                  </td>
                  {student.lessons_status.map((status, index) => {
                    const statusInfo = getStatusIcon(status);
                    return (
                      <td 
                        key={index} 
                        className={`lesson-status-cell ${statusInfo.className}`}
                        title={statusInfo.label}
                      >
                        <span className="status-icon">{statusInfo.icon}</span>
                      </td>
                    );
                  })}
                  <td className="actions-cell">
                    <button 
                      className="btn-actions"
                      onClick={() => handleStudentActionClick(student.id)}
                      title="Show actions"
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
                {activeStudentActions === student.id && (
                  <tr className="student-actions-row">
                    <td colSpan={tableData.lessons.length + 2}>
                      <div className="actions-menu">
                        <button 
                          className="action-btn payment"
                          onClick={() => handlePaymentClick(student.id, student.name)}
                        >
                          💳 Pay for Lessons
                        </button>
                        <button 
                          className="action-btn bonus"
                          onClick={() => handleBonusClick(student.id, student.name)}
                        >
                          ⭐ Add Bonus
                        </button>
                        <button 
                          className="action-btn remove"
                          onClick={() => handleRemoveLessonClick(student.id, student.name)}
                        >
                          ❌ Remove Lesson
                        </button>
                        <button 
                          className="action-btn close"
                          onClick={() => setActiveStudentActions(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="lesson-table-legend">
        <span><span className="icon">✅</span> Paid</span>
        <span><span className="icon">⭐</span> Bonus</span>
        <span><span className="icon">🔴</span> Unpaid</span>
        <span><span className="icon">❌</span> Removed</span>
        <span><span className="icon">⚪</span> Future</span>
      </div>

      {/* Refresh button */}
      <div className="lesson-table-footer">
        <button className="btn-refresh" onClick={loadTableData}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default StudentLessonTable;
