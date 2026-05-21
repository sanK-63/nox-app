import React from 'react';
import Heatmap from './Heatmap';
import Pomodoro from './Pomodoro';

export default function Sidebar({ activeTab, setActiveTab, tasks, syncContext }) {
  const completed = tasks.filter(t => t.is_completed).length;
  const { syncStatus, handleAuth, handleSync, handleRestore } = syncContext;

  return (
    <aside className="side-panel">
      <div className="logo">Nox.</div>
      
      <nav className="nav-menu">
        <div className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          <span className="nav-item-text">Задачи</span>
        </div>
        <div className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          <span className="nav-item-text">Календарь</span>
        </div>
        <div className={`nav-item ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          <span className="nav-item-text">Таймлайн</span>
        </div>
      </nav>

      <Pomodoro />
      <Heatmap tasks={tasks} />

      <div className="stats-box">
        <div className="stats-row"><span>Задач</span><span>{tasks.length}</span></div>
        <div className="stats-row"><span>Готово</span><span>{completed}</span></div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${tasks.length > 0 ? (completed / tasks.length) * 100 : 0}%` }}></div>
        </div>
      </div>

      <div className="sync-box">
        {!syncStatus.isAuthenticated ? (
          <button className="sync-btn auth" onClick={handleAuth}>Привязать Диск</button>
        ) : (
          <>
            <button className={`sync-btn ${syncStatus.isSyncing ? 'syncing' : ''}`} onClick={handleSync} disabled={syncStatus.isSyncing}>
              {syncStatus.isSyncing ? 'Синхронизация...' : 'В облако'}
            </button>
            <button className="restore-btn" onClick={handleRestore} disabled={syncStatus.isRestoring}>
              {syncStatus.isRestoring ? 'Восстановление...' : 'Из облака'}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
