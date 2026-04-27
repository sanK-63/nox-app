import React from 'react';

const Heatmap = ({ tasks }) => {
  const stats = {};
  
  tasks.forEach(task => {
    if (task.deadline) {
      const day = task.deadline.split('T')[0];
      stats[day] = (stats[day] || 0) + 1;
    }
  });

  const days = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    return d.toISOString().split('T')[0];
  });

  const getLevel = (count) => {
    if (!count) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    return 3;
  };

  return (
    <div className="stats-section">
      <div className="heatmap-header">Активность</div>
      <div className="heatmap-grid">
        {days.map(date => (
          <div 
            key={date}
            className={`heat-cell level-${getLevel(stats[date])}`}
            title={`${date}: ${stats[date] || 0} задач`}
          />
        ))}
      </div>
      <div className="heatmap-footer">
        <span>Меньше</span>
        <div className="heat-cell level-0"></div>
        <div className="heat-cell level-1"></div>
        <div className="heat-cell level-2"></div>
        <div className="heat-cell level-3"></div>
        <span>Больше</span>
      </div>
    </div>
  );
};

export default Heatmap;