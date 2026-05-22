import React, { useMemo } from 'react';
import Tooltip from './Tooltip';
import './TimelineStyles.css';

const PRIORITY_COLORS = {
  high:   { bg: 'rgba(239, 68, 68, 0.2)',  border: 'rgba(239, 68, 68, 0.45)' },
  medium: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.45)' },
  low:    { bg: 'rgba(124, 58, 237, 0.2)', border: 'rgba(124, 58, 237, 0.45)' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

const TimelineView = ({ tasks, onTaskClick }) => {
  const timelineDays = useMemo(() => {
    const days = [];
    const start = new Date();
    start.setDate(1);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const getTaskStyle = (task) => {
    if (!task.start_date || !task.deadline) {
      const date = new Date(task.deadline || task.created_at);
      const dayIndex = timelineDays.findIndex(d => d.toDateString() === date.toDateString());
      if (dayIndex === -1) return { display: 'none' };
      return {
        left: `${(dayIndex / timelineDays.length) * 100}%`,
        width: `${(1 / timelineDays.length) * 100}%`,
      };
    }

    const start = new Date(task.start_date);
    const end = new Date(task.deadline);
    const startIndex = timelineDays.findIndex(d => d.toDateString() === start.toDateString());
    const endIndex = timelineDays.findIndex(d => d.toDateString() === end.toDateString());

    if (startIndex === -1 && endIndex === -1) return { display: 'none' };

    const left = Math.max(0, startIndex);
    const right = endIndex === -1 ? timelineDays.length - 1 : endIndex;
    const duration = Math.max(1, right - left + 1);

    return {
      left: `${(left / timelineDays.length) * 100}%`,
      width: `${(duration / timelineDays.length) * 100}%`,
    };
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-days-row">
          {timelineDays.map((day, i) => (
            <div key={i} className="timeline-day-col">
              <span className="day-name">{day.toLocaleString('ru', { weekday: 'short' })}</span>
              <span className="day-num">{day.getDate()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="timeline-body">
        <div className="timeline-grid-lines">
          {timelineDays.map((_, i) => <div key={i} className="grid-line" />)}
        </div>

        <div className="timeline-rows">
          {tasks.map((task) => {
            const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;
            return (
              <div key={task.id} className="timeline-row">
                <Tooltip
                  content={
                    <div>
                      <div style={{ fontWeight: 600 }}>{task.title}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.65rem' }}>
                        {formatDate(task.start_date)} — {formatDate(task.deadline)}
                      </div>
                    </div>
                  }
                  position="top"
                >
                  <div
                    className={`timeline-bar priority-${task.priority} ${task.is_completed ? 'completed' : ''}`}
                    style={{
                      ...getTaskStyle(task),
                      background: pc.bg,
                      borderColor: pc.border,
                      color: '#1A1A1A',
                    }}
                    onClick={() => onTaskClick(task)}
                  >
                    <span className="bar-title">{task.title}</span>
                  </div>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
