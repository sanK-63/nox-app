import React from 'react';
import Heatmap from './Heatmap';
import Pomodoro from './Pomodoro';

export default function Sidebar({ activeTab, setActiveTab, tasks, tags, activeTags, setActiveTags, deleteTag, syncContext }) {
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

      {tags.length > 0 && (
        <div className="tags-filter">
          <div className="tags-filter-header">
            <span className="tags-filter-label">Теги</span>
            <button className={`tag-clear-btn ${activeTags.length === 0 ? 'hidden' : ''}`} onClick={() => setActiveTags([])}>сброс</button>
          </div>
          <div className="tags-filter-list">
            {tags.map(tag => (
              <button
                key={tag.id}
                className={`tag-filter-chip ${activeTags.includes(tag.id) ? 'active' : ''}`}
                style={{
                  background: activeTags.includes(tag.id) ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: activeTags.includes(tag.id) ? '#fff' : tag.color,
                }}
                onClick={() => setActiveTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

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
