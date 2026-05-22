import React, { useMemo } from 'react';
import Tooltip from './Tooltip';

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const ROW_LABELS = { 0: 'Пн', 2: 'Ср', 4: 'Пт' };

function getMonday(d) {
  const c = new Date(d);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function formatTooltipDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
}

function tooltipText(date, count) {
  const d = formatTooltipDate(date);
  if (count === 0) return `${d}: нет активности`;
  if (count === 1) return `${d}: 1 задача`;
  if (count >= 2 && count <= 4) return `${d}: ${count} задачи`;
  return `${d}: ${count} задач`;
}

const Heatmap = ({ tasks }) => {
  const stats = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.deadline) {
        const day = task.deadline.split('T')[0];
        map[day] = (map[day] || 0) + 1;
      }
    });
    return map;
  }, [tasks]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = getMonday(today);
    start.setDate(start.getDate() - 6 * 7);

    const wks = [];
    const months = [];
    const cursor = new Date(start);
    let lastMonth = -1;

    for (let w = 0; w < 7; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().split('T')[0];
        week.push(iso);
        if (cursor.getMonth() !== lastMonth && d === 0) {
          months.push({ col: w, label: MONTHS_RU[cursor.getMonth()] });
          lastMonth = cursor.getMonth();
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      wks.push(week);
    }
    return { weeks: wks, monthLabels: months };
  }, []);

  const getLevel = (count) => {
    if (!count || count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  return (
    <div className="stats-section">
      <div className="heatmap-header">Активность</div>
      <div className="heatmap-v2">
        <div className="heatmap-month-row">
          <span className="heatmap-day-label" />
          {monthLabels.map((m, i) => {
            const nextCol = i < monthLabels.length - 1 ? monthLabels[i + 1].col : 7;
            return (
              <span key={i} className="heatmap-month-label" style={{ gridColumn: `${m.col + 2} / span ${nextCol - m.col}` }}>
                {m.label}
              </span>
            );
          })}
        </div>

        {[0, 1, 2, 3, 4, 5, 6].map(rowIdx => (
          <div className="heatmap-week-row" key={rowIdx}>
            <span className="heatmap-day-label">
              {ROW_LABELS[rowIdx] || ''}
            </span>
            {weeks.map((week, wi) => {
              const date = week[rowIdx];
              const count = stats[date] || 0;
              return (
                <Tooltip key={date} content={tooltipText(date, count)} position="top">
                  <div className={`heat-cell-v2 level-${getLevel(count)}`} />
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-footer">
        <span>Меньше</span>
        <div className="heat-cell-v2 level-0" style={{ width: 10, height: 10 }} />
        <div className="heat-cell-v2 level-1" style={{ width: 10, height: 10 }} />
        <div className="heat-cell-v2 level-2" style={{ width: 10, height: 10 }} />
        <div className="heat-cell-v2 level-3" style={{ width: 10, height: 10 }} />
        <div className="heat-cell-v2 level-4" style={{ width: 10, height: 10 }} />
        <span>Больше</span>
      </div>
    </div>
  );
};

export default Heatmap;
