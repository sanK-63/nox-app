import React, { useState, useEffect, useRef } from 'react';
import Heatmap from './Heatmap';
import TaskCalendar from './TaskCalendar';
import TimelineView from './TimelineView';
import '../App.css';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active'); // Changed default to 'active'
  const [activeTab, setActiveTab] = useState('tasks');
  const [syncStatus, setSyncStatus] = useState({ isAuthenticated: false, isSyncing: false, isRestoring: false, lastSync: null, backupFolderId: null });
  const [folders, setFolders] = useState([]);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  
  // Pomodoro Timer
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    checkSyncStatus();
    loadTasks();
  }, []);

  const loadTasks = async () => {
    if (window.api?.getTasks) {
      const dbTasks = await window.api.getTasks();
      setTasks(dbTasks);
    } else {
      const saved = localStorage.getItem('tasks');
      if (saved) setTasks(JSON.parse(saved));
    }
  };

  const checkSyncStatus = async () => {
    if (window.api?.nox) {
      const status = await window.api.nox.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, isAuthenticated: status.isAuthenticated, backupFolderId: status.backupFolderId }));
    }
  };

  const handleAuth = async () => {
    if (window.api?.nox) {
      const result = await window.api.nox.auth();
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, isAuthenticated: true }));
        loadFolders();
      }
    }
  };

  const loadFolders = async () => {
    if (window.api?.nox) {
      const result = await window.api.nox.listFolders();
      if (result.success) {
        setFolders(result.folders);
        setIsFolderPickerOpen(true);
      }
    }
  };

  const selectFolder = async (folderId) => {
    if (window.api?.nox) {
      const result = await window.api.nox.setBackupFolder(folderId);
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, backupFolderId: folderId }));
        setIsFolderPickerOpen(false);
      }
    }
  };

  const handleSync = async () => {
    if (window.api?.nox) {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      const result = await window.api.nox.sync();
      setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: result.success ? result.lastSync : prev.lastSync }));
    }
  };

  const handleRestore = async () => {
    if (!confirm('Вы уверены? Это действие заменит текущие задачи задачами из облака.')) return;
    if (window.api?.nox) {
      setSyncStatus(prev => ({ ...prev, isRestoring: true }));
      const result = await window.api.nox.restore();
      setSyncStatus(prev => ({ ...prev, isRestoring: false }));
      if (result.success) {
        const dbTasks = await window.api.getTasks();
        setTasks(dbTasks);
      }
    }
  };

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

  const openDrawer = (task = null) => {
    setActiveTask(task ? { ...task } : { 
      id: null, 
      title: '', 
      description: '', 
      priority: 'low', 
      start_date: '', 
      deadline: '', 
      task_type: 'quick',
      subtasks: [] 
    });
    setIsDrawerOpen(true);
  };

  const saveTask = async () => {
    if (!activeTask.title.trim()) return;
    if (window.api?.addTask) {
      await window.api.addTask(activeTask);
      loadTasks();
    } else {
      const newTask = { ...activeTask, id: activeTask.id || Date.now(), is_completed: 0 };
      const updated = activeTask.id ? tasks.map(t => t.id === activeTask.id ? activeTask : t) : [newTask, ...tasks];
      setTasks(updated);
      localStorage.setItem('tasks', JSON.stringify(updated));
    }
    setIsDrawerOpen(false);
  };

  const toggleTask = async (id, currentStatus) => {
    if (window.api?.toggleTask) {
      await window.api.toggleTask({ id, is_completed: !currentStatus });
      loadTasks();
    }
  };

  const deleteTask = async (id, e) => {
    e.stopPropagation();
    if (window.api?.deleteTask) {
      await window.api.deleteTask(id);
      loadTasks();
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    if (activeTask.id && window.api?.addSubtask) {
      await window.api.addSubtask({ task_id: activeTask.id, title: newSubtask });
      loadTasks();
      const updatedTasks = await window.api.getTasks();
      const currentTask = updatedTasks.find(t => t.id === activeTask.id);
      setActiveTask(currentTask);
    } else {
      const updatedSubtasks = [...(activeTask.subtasks || []), { title: newSubtask, is_completed: 0, id: Date.now() }];
      setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    }
    setNewSubtask('');
  };

  const toggleSubtask = async (stId, currentStatus) => {
    if (window.api?.toggleSubtask) {
      await window.api.toggleSubtask({ id: stId, is_completed: !currentStatus });
      loadTasks();
      const updatedTasks = await window.api.getTasks();
      const currentTask = updatedTasks.find(t => t.id === activeTask.id);
      setActiveTask(currentTask);
    } else {
      const updatedSubtasks = activeTask.subtasks.map(st => st.id === stId ? { ...st, is_completed: !currentStatus ? 1 : 0 } : st);
      setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    }
  };

  const getSmartRankedTasks = (tasksList) => {
    return [...tasksList].sort((a, b) => {
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      const aDeadline = a.deadline ? new Date(a.deadline) : null;
      const bDeadline = b.deadline ? new Date(b.deadline) : null;
      
      const aIsUrgent = aDeadline && (aDeadline - now) < dayInMs;
      const bIsUrgent = bDeadline && (bDeadline - now) < dayInMs;
      
      if (aIsUrgent && !bIsUrgent) return -1;
      if (!aIsUrgent && bIsUrgent) return 1;
      
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      
      // Progress weight for projects
      if (a.task_type === 'project' && b.task_type === 'project') {
        const getProgress = (t) => {
          if (!t.subtasks || t.subtasks.length === 0) return 0;
          return t.subtasks.filter(s => s.is_completed).length / t.subtasks.length;
        };
        const aProgress = getProgress(a);
        const bProgress = getProgress(b);
        if (aProgress > 0.8 && bProgress <= 0.8) return -1;
        if (aProgress <= 0.8 && bProgress > 0.8) return 1;
      }
      
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const filteredTasks = getSmartRankedTasks(tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    if (filter === 'active') return matchesSearch && !t.is_completed;
    if (filter === 'urgent') return matchesSearch && t.priority === 'high' && !t.is_completed;
    if (filter === 'completed') return matchesSearch && t.is_completed;
    return matchesSearch;
  }));

  const completed = tasks.filter(t => t.is_completed).length;

  return (
    <div className="app-layout">
      <aside className="side-panel">
        <div className="logo">Nox.</div>
        
        <nav className="nav-menu">
          <div className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <span>📝</span> <span className="nav-item-text">Задачи</span>
          </div>
          <div className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <span>📅</span> <span className="nav-item-text">Календарь</span>
          </div>
          <div className={`nav-item ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
            <span>📊</span> <span className="nav-item-text">Таймлайн</span>
          </div>
        </nav>

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
            <button className="sync-btn auth" onClick={handleAuth}>🔗 Привязать Диск</button>
          ) : (
            <>
              <button className={`sync-btn ${syncStatus.isSyncing ? 'syncing' : ''}`} onClick={handleSync} disabled={syncStatus.isSyncing}>
                {syncStatus.isSyncing ? '🔄' : '☁️ В облако'}
              </button>
              <button className="restore-btn" onClick={handleRestore} disabled={syncStatus.isRestoring}>
                {syncStatus.isRestoring ? '⏳' : '📥 Из облака'}
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="day-progress-line" style={{ width: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 1440 * 100}%` }}></div>
        <header className="content-header">
          <h1>{activeTab === 'tasks' ? 'Мои задачи' : activeTab === 'calendar' ? 'Календарь' : 'Таймлайн'}</h1>
          <button className="add-btn-main" onClick={() => openDrawer()}>+ Создать</button>
        </header>

        <div className="scroll-area">
          {activeTab === 'tasks' ? (
            <>
              <input className="search-bar" placeholder="Поиск задач..." value={search} onChange={e => setSearch(e.target.value)} />
              
              <div className="filter-chips">
                <button className={`filter-chip ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>В работе</button>
                <button className={`filter-chip ${filter === 'urgent' ? 'active' : ''}`} onClick={() => setFilter('urgent')}>Важные</button>
                <button className={`filter-chip ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Архив</button>
              </div>

              <div className="task-list">
                {filteredTasks.map(task => {
                  const subCount = task.subtasks?.length || 0;
                  const completedSub = task.subtasks?.filter(s => s.is_completed).length || 0;
                  const progress = subCount > 0 ? (completedSub / subCount) * 100 : 0;
                  
                  const isUrgent = task.deadline && (new Date(task.deadline) - new Date()) < (24 * 60 * 60 * 1000);

                  return (
                    <div key={task.id} className={`task-item-compact ${isUrgent ? 'urgent-border' : ''}`} onClick={() => openDrawer(task)}>
                      <div className={`priority-line ${task.priority}`} onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.is_completed); }}></div>
                      <div className="task-content-main">
                        <div className="task-title-row">
                          <span className={`task-text ${task.is_completed ? 'completed' : ''}`}>{task.title}</span>
                          {task.task_type === 'project' && (
                            <span className="task-type-badge">Проект</span>
                          )}
                        </div>
                        {task.task_type === 'project' && (
                          <div className="project-progress-wrapper">
                            <div className="task-card-progress">
                              <div 
                                className={`progress-bar-mini ${progress === 100 ? 'full' : ''}`} 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <span className="progress-percent">{Math.round(progress)}%</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="task-actions">
                        {task.deadline && (
                          <span className={`task-date ${isUrgent ? 'urgent-text' : ''}`}>
                            {new Date(task.deadline).toLocaleDateString('ru-RU', {day:'numeric', month:'short'})}
                          </span>
                        )}
                        <button className="action-btn delete-btn" onClick={(e) => deleteTask(task.id, e)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : activeTab === 'calendar' ? (
            <div className="calendar-wrapper">
              <TaskCalendar tasks={tasks} onTaskClick={openDrawer} />
            </div>
          ) : (
            <div className="timeline-wrapper">
              <TimelineView tasks={tasks} onTaskClick={openDrawer} />
            </div>
          )}
        </div>
      </main>

      <div className={`modal-overlay ${isDrawerOpen ? 'active' : ''}`} onClick={() => setIsDrawerOpen(false)}>
        <aside className={`task-drawer ${isDrawerOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="drawer-inner">
            <header className="drawer-header">
              <button className="close-drawer" onClick={() => setIsDrawerOpen(false)}>✕</button>
              <button className="save-task-btn" onClick={saveTask}>Сохранить</button>
            </header>

            <div className="task-type-toggle">
              <button 
                className={`type-btn ${activeTask?.task_type === 'quick' ? 'active' : ''}`}
                onClick={() => setActiveTask({...activeTask, task_type: 'quick'})}
              >Быстрая</button>
              <button 
                className={`type-btn ${activeTask?.task_type === 'project' ? 'active' : ''}`}
                onClick={() => setActiveTask({...activeTask, task_type: 'project'})}
              >Проект</button>
            </div>

            <input 
              className="drawer-title-input" 
              placeholder="Название задачи"
              value={activeTask?.title || ''}
              onChange={e => setActiveTask({...activeTask, title: e.target.value})}
            />

            <div className="drawer-meta">
              <div className="meta-item">
                <label>Приоритет</label>
                <select value={activeTask?.priority || 'low'} onChange={e => setActiveTask({...activeTask, priority: e.target.value})}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              <div className="meta-item">
                <label>Дедлайн</label>
                <input type="datetime-local" value={activeTask?.deadline || ''} onChange={e => setActiveTask({...activeTask, deadline: e.target.value})} />
              </div>
            </div>

            {activeTask?.task_type === 'project' && (
              <div className="drawer-subtasks">
                <label>Подзадачи</label>
                <div className="subtask-input-row">
                  <input 
                    placeholder="Новый пункт..." 
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                  />
                  <button onClick={handleAddSubtask}>+</button>
                </div>
                <div className="subtask-list">
                  {activeTask.subtasks?.map(st => (
                    <div key={st.id} className="subtask-item">
                      <input type="checkbox" checked={st.is_completed} onChange={() => toggleSubtask(st.id, st.is_completed)} />
                      <span className={st.is_completed ? 'completed' : ''}>{st.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="drawer-section">
              <textarea 
                className="drawer-description"
                placeholder="Добавьте детали..."
                value={activeTask?.description || ''}
                onChange={e => setActiveTask({...activeTask, description: e.target.value})}
              />
            </div>
          </div>
        </aside>
      </div>

      {isFolderPickerOpen && (
        <div className="modal-overlay active">
          <div className="folder-picker-modal">
            <header className="drawer-header">
              <h3>Выбор папки бэкапа</h3>
              <button className="close-drawer" onClick={() => setIsFolderPickerOpen(false)}>✕</button>
            </header>
            <div className="folder-list">
              {folders.length > 0 ? folders.map(f => (
                <div key={f.id} className="folder-item" onClick={() => selectFolder(f.id)}>
                  📁 {f.name}
                </div>
              )) : (
                <div className="folder-item">Папок не найдено.</div>
              )}
            </div>
            <button className="save-task-btn" style={{width:'100%', height:'45px'}} onClick={() => selectFolder(null)}>Использовать корень</button>
          </div>
        </div>
      )}
    </div>
  );
}