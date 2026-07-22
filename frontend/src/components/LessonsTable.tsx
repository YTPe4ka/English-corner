import React from 'react';
import './LessonsTable.css';

interface Lesson {
  id: number;
  group: number;
  lesson_number: number;
  scheduled_date: string;
  duration_minutes: number;
  topic?: string;
  description?: string;
  homework?: string;
  is_completed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface LessonsTableProps {
  lessons: Lesson[];
  isAdmin: boolean;
  onLessonClick?: (lesson: Lesson) => void;
  onEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson?: (lessonId: number) => void;
}

const LessonsTable: React.FC<LessonsTableProps> = ({
  lessons,
  isAdmin,
  onLessonClick,
  onEditLesson,
  onDeleteLesson,
}) => {
  if (lessons.length === 0) {
    return (
      <div className="lessons-table-empty">
        <p>No lessons scheduled yet.</p>
      </div>
    );
  }

  const sortedLessons = [...lessons].sort((a, b) => a.lesson_number - b.lesson_number);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="lessons-table-container">
      <table className="lessons-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Scheduled Date</th>
            <th>Duration (min)</th>
            <th>Status</th>
            <th>Notes</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedLessons.map((lesson) => (
            <tr
              key={lesson.id}
              className={`lesson-row ${lesson.is_completed ? 'completed' : ''}`}
              onClick={() => onLessonClick?.(lesson)}
              style={{ cursor: 'pointer' }}
            >
              <td className="lesson-number">
                <span className="badge">{lesson.lesson_number}</span>
              </td>
              <td className="lesson-date">
                {lesson.scheduled_date ? formatDate(lesson.scheduled_date) : 'Not scheduled'}
              </td>
              <td className="lesson-duration">{lesson.duration_minutes} min</td>
              <td className="lesson-status">
                <span className={`status-badge ${lesson.is_completed ? 'completed' : 'pending'}`}>
                  {lesson.is_completed ? '✓ Completed' : 'Pending'}
                </span>
              </td>
              <td className="lesson-notes">{lesson.topic || lesson.notes || '-'}</td>
              {isAdmin && (
                <td className="lesson-actions">
                  <button
                    type="button"
                    className="btn-small btn-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditLesson?.(lesson);
                    }}
                    title="Edit lesson"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-small btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLesson?.(lesson.id);
                    }}
                    title="Delete lesson"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LessonsTable;
