import React, { useState, useEffect, useRef } from 'react';

export default function Pomodoro() {
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => (t <= 1 ? (setIsTimerRunning(false), 0) : t - 1));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pomodoro-box">
      <div className="pomodoro-timer">{formatTime(timer)}</div>
      <div className="pomodoro-controls">
        {!isTimerRunning ? (
          <button className="pom-btn start" onClick={() => setIsTimerRunning(true)}>Старт</button>
        ) : (
          <button className="pom-btn stop" onClick={() => setIsTimerRunning(false)}>Стоп</button>
        )}
        <button className="pom-btn reset" onClick={() => { setIsTimerRunning(false); setTimer(25 * 60); }}>Сброс</button>
      </div>
    </div>
  );
}
