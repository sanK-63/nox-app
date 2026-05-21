import React, { useState, useMemo, useEffect } from 'react';
import TaskCalendar from './TaskCalendar';
import TimelineView from './TimelineView';
import Sidebar from './Sidebar';
import TaskDrawer from './TaskDrawer';
import Toast from './Toast';
import { useTasks } from '../hooks/useTasks';
import { useGoogleSync } from '../hooks/useGoogleSync';
import '../App.css';

export default function Dashboard() {
  const { tasks, tags, isLoading, loadTasks, saveTask, toggleTask, deleteTask, addSubtaskToTask, toggleSubtaskInTask, deleteSubtaskFromTask, addTag, deleteTag, addTaskTag, removeTaskTag } = useTasks();
  const syncContext = useGoogleSync(loadTasks);
  const { folders, isFolderPickerOpen, setIsFolderPickerOpen, selectFolder } = syncContext;

  const [activeTab, setActiveTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [activeTags, setActiveTags] = useState([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  const openDrawer = (task = null) => {
    setActiveTask(task ? { ...task } : { 
      id: null, 
      title: '', 
      description: '', 
      priority: 'low', 
      start_date: '', 
      deadline: '', 
      task_type: 'quick',
      subtasks: [],
      tags: [] 
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
        return;
      }
      if (e.key === 'Escape' && isFolderPickerOpen) {
        setIsFolderPickerOpen(false);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openDrawer();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.querySelector('.search-bar')?.focus();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isFolderPickerOpen]);

  const handleSaveTask = async (taskData) => {
    await saveTask(taskData);
    closeDrawer();
  };

  const filteredTasks = useMemo(() => {
    const matches = tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesTags = activeTags.length === 0 || activeTags.some(tagId => t.tags?.some(tag => tag.id === tagId));
      if (!matchesTags) return false;
      if (filter === 'active') return matchesSearch && !t.is_completed;
      if (filter === 'urgent') return matchesSearch && t.priority === 'high' && !t.is_completed;
      if (filter === 'completed') return matchesSearch && t.is_completed;
      return matchesSearch;
    });

    return [...matches].sort((a, b) => {
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;

      if (filter === 'completed') {
        return new Date(b.archived_at || 0) - new Date(a.archived_at || 0);
      }
      
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
  }, [tasks, search, filter, activeTags]);

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tasks={tasks} 
        tags={tags}
        activeTags={activeTags}
        setActiveTags={setActiveTags}
        deleteTag={deleteTag}
        syncContext={syncContext} 
      />

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

              {isLoading && <div className="loading-spinner"><div className="spinner"></div><span>Загрузка задач...</span></div>}

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
                          <div className="task-tags-row">
                            {task.tags?.map(tag => (
                              <span key={tag.id} className="tag-badge" style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>{tag.name}</span>
                            ))}
                            {task.task_type === 'project' && (
                              <span className="task-type-badge">Проект</span>
                            )}
                          </div>
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
                        <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); if (confirm('Удалить задачу?')) deleteTask(task.id); }}>✕</button>
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

      <TaskDrawer 
        activeTask={activeTask} 
        isOpen={isDrawerOpen} 
        onClose={closeDrawer} 
        onSave={handleSaveTask} 
        onAddSubtask={addSubtaskToTask}
        onToggleSubtask={toggleSubtaskInTask}
        onDeleteSubtask={deleteSubtaskFromTask}
        tags={tags}
        onAddTag={addTag}
        onAddTaskTag={addTaskTag}
        onRemoveTaskTag={removeTaskTag}
      />

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
                  {f.name}
                </div>
              )) : (
                <div className="folder-item">Папок не найдено.</div>
              )}
            </div>
            <button className="save-task-btn" style={{width:'100%', height:'45px'}} onClick={() => selectFolder(null)}>Использовать корень</button>
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}