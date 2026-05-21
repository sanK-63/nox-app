import React, { useState } from 'react';
import './CalendarStyles.css';

const TaskCalendar = ({ tasks, onTaskClick }) => {
  const [viewDate, setViewDate] = useState(new Date(2026, 3, 1));
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const monthName = viewDate.toLocaleString('ru', { month: 'long', year: 'numeric' });

  const changeMonth = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    setSelectedDay(null);
  };

  const getTasksForDay = (day) => {
    if (!day) return [];
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.deadline?.startsWith(dateStr));
  };

  const selectedDayTasks = getTasksForDay(selectedDay);

  return (
    <div className="calendar-container">
      <div className="calendar-controls">
        <button onClick={() => changeMonth(-1)}>←</button>
        <span className="current-month">{monthName}</span>
        <button onClick={() => changeMonth(1)}>→</button>
      </div>

      <div className="calendar-monolith">
        <div className="calendar-week-days">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: 42 }).map((_, i) => {
            const day = i - startOffset + 1;
            const isCurrentMonth = day > 0 && day <= daysInMonth;
            const tasksCount = isCurrentMonth ? getTasksForDay(day).length : 0;
            const workloadLevel = tasksCount === 0 ? 0 : tasksCount <= 1 ? 1 : tasksCount <= 3 ? 2 : 3;

            return (
              <div 
                key={i} 
                className={`calendar-cell ${!isCurrentMonth ? 'empty' : ''} ${selectedDay === day ? 'selected' : ''} workload-level-${workloadLevel}`}
                onClick={() => isCurrentMonth && setSelectedDay(day)}
              >
                {isCurrentMonth && (
                  <>
                    <span className="day-num">{day}</span>
                    {tasksCount > 0 && <div className="task-indicator">{tasksCount}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="day-details-panel">
          <h3>Задачи на {selectedDay} {monthName}</h3>
          <div className="mini-task-list">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map(t => (
                <div key={t.id} className="mini-task-item" onClick={() => onTaskClick && onTaskClick(t)}>
                  <span className={`priority-pill ${t.priority}`}>
                    {t.priority === 'high' ? 'Высокий' : t.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </span>
                  <span className="title">{t.title}</span>
                  <span className="time">{t.deadline ? t.deadline.split('T')[1] : ''}</span>
                </div>
              ))
            ) : (
              <div className="no-tasks">Задач нет</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;