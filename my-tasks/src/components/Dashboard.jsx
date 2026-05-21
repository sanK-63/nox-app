import React, { useState, useMemo } from 'react';
import TaskCalendar from './TaskCalendar';
import TimelineView from './TimelineView';
import Sidebar from './Sidebar';
import TaskDrawer from './TaskDrawer';
import { useTasks } from '../hooks/useTasks';
import { useGoogleSync } from '../hooks/useGoogleSync';
import '../App.css';

export default function Dashboard() {
  const { tasks, loadTasks, saveTask, toggleTask, deleteTask, addSubtaskToTask, toggleSubtaskInTask, deleteSubtaskFromTask } = useTasks();
  const syncContext = useGoogleSync(loadTasks);
  const { folders, isFolderPickerOpen, setIsFolderPickerOpen, selectFolder } = syncContext;

  const [activeTab, setActiveTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');

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
      subtasks: [] 
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleSaveTask = async (taskData) => {
    await saveTask(taskData);
    closeDrawer();
  };

  const filteredTasks = useMemo(() => {
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

    return getSmartRankedTasks(tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      if (filter === 'active') return matchesSearch && !t.is_completed;
      if (filter === 'urgent') return matchesSearch && t.priority === 'high' && !t.is_completed;
      if (filter === 'completed') return matchesSearch && t.is_completed;
      return matchesSearch;
    }));
  }, [tasks, search, filter]);

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tasks={tasks} 
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
                        <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>✕</button>
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
    </div>
  );
}