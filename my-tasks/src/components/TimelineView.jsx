import React, { useMemo } from 'react';
import './TimelineStyles.css';

const TimelineView = ({ tasks, onTaskClick }) => {
  // Generate a range of days for the timeline (e.g., current month)
  const timelineDays = useMemo(() => {
    const days = [];
    const start = new Date();
    start.setDate(1); // Start of month
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const getTaskStyle = (task) => {
    if (!task.start_date || !task.deadline) {
      // Fallback: show as a single day if dates are missing
      const date = new Date(task.deadline || task.created_at);
      const dayIndex = timelineDays.findIndex(d => d.toDateString() === date.toDateString());
      if (dayIndex === -1) return { display: 'none' };
      return {
        left: `${(dayIndex / timelineDays.length) * 100}%`,
        width: `${(1 / timelineDays.length) * 100}%`
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
      width: `${(duration / timelineDays.length) * 100}%`
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
          {tasks.map((task) => (
            <div key={task.id} className="timeline-row">
              <div 
                className={`timeline-bar priority-${task.priority} ${task.is_completed ? 'completed' : ''}`}
                style={getTaskStyle(task)}
                onClick={() => onTaskClick(task)}
              >
                <span className="bar-title">{task.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
