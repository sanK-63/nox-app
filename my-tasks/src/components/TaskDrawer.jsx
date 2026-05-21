import React, { useState, useEffect } from 'react';

export default function TaskDrawer({ activeTask: initialTask, isOpen, onClose, onSave, onAddSubtask, onToggleSubtask, onDeleteSubtask }) {
  const [activeTask, setActiveTask] = useState(initialTask);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    setActiveTask(initialTask);
  }, [initialTask]);

  if (!activeTask) return null;

  const saveTask = () => {
    onSave(activeTask);
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    const updatedTask = await onAddSubtask(activeTask.id, newSubtask);
    if (updatedTask) {
      setActiveTask(updatedTask);
    } else {
      // Local fallback
      const updatedSubtasks = [...(activeTask.subtasks || []), { title: newSubtask, is_completed: 0, id: Date.now() }];
      setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    }
    setNewSubtask('');
  };

  const toggleSubtask = async (stId, currentStatus) => {
    const updatedTask = await onToggleSubtask(activeTask.id, stId, currentStatus);
    if (updatedTask) {
      setActiveTask(updatedTask);
    } else {
      // Local fallback
      const updatedSubtasks = activeTask.subtasks.map(st => st.id === stId ? { ...st, is_completed: !currentStatus ? 1 : 0 } : st);
      setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    }
  };

  const deleteSubtask = async (stId) => {
    const updatedTask = await onDeleteSubtask(activeTask.id, stId);
    if (updatedTask) {
      setActiveTask(updatedTask);
    } else {
      const updatedSubtasks = activeTask.subtasks.filter(st => st.id !== stId);
      setActiveTask({ ...activeTask, subtasks: updatedSubtasks });
    }
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <aside className={`task-drawer ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="drawer-inner">
          <header className="drawer-header">
            <button className="close-drawer" onClick={onClose}>✕</button>
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
                    <span className={st.is_completed ? 'completed' : ''} style={{ flex: 1 }}>{st.title}</span>
                    <button className="action-btn delete-btn" onClick={() => deleteSubtask(st.id)}>✕</button>
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
  );
}
