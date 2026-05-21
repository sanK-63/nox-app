import React, { useState, useEffect } from 'react';

const TAG_PRESETS = [
  { name: 'Работа', color: '#3b82f6' },
  { name: 'Личное', color: '#ec4899' },
  { name: 'Учёба', color: '#f59e0b' },
  { name: 'Здоровье', color: '#10b981' },
  { name: 'Финансы', color: '#8b5cf6' },
  { name: 'Идеи', color: '#06b6d4' },
  { name: 'Важное', color: '#ef4444' },
  { name: 'Покупки', color: '#84cc16' },
];

export default function TaskDrawer({ activeTask: initialTask, isOpen, onClose, onSave, onAddSubtask, onToggleSubtask, onDeleteSubtask, tags, onAddTag, onAddTaskTag, onRemoveTaskTag }) {
  const [activeTask, setActiveTask] = useState(initialTask);
  const [newSubtask, setNewSubtask] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    setActiveTask(initialTask);
    if (initialTask) {
      setIsEditing(!initialTask.id);
    }
    setNewTagName('');
    setShowPresets(false);
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

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const result = await onAddTag(name);
    if (result && result.id) {
      await onAddTaskTag(activeTask.id, result.id);
    }
    setNewTagName('');
  };

  const handlePresetTag = async (preset) => {
    const existing = tags.find(t => t.name === preset.name);
    if (existing) {
      await onAddTaskTag(activeTask.id, existing.id);
    } else {
      const result = await onAddTag(preset.name, preset.color);
      if (result && result.id) {
        await onAddTaskTag(activeTask.id, result.id);
      }
    }
    setShowPresets(false);
  };

  const priorityLabel = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
  const typeLabel = { quick: 'Быстрая', project: 'Проект' };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <aside className={`task-drawer ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="drawer-inner">
          <header className="drawer-header">
            <button className="close-drawer" onClick={onClose}>✕</button>
            {isEditing ? (
              <button className="save-task-btn" onClick={saveTask}>Сохранить</button>
            ) : (
              <button className="edit-task-btn" onClick={() => setIsEditing(true)}>Редактировать</button>
            )}
          </header>

          {isEditing ? (
            <>
              <div className="task-type-toggle">
                <button
                  className={`type-btn ${activeTask?.task_type === 'quick' ? 'active' : ''}`}
                  onClick={() => setActiveTask({ ...activeTask, task_type: 'quick' })}
                >Быстрая</button>
                <button
                  className={`type-btn ${activeTask?.task_type === 'project' ? 'active' : ''}`}
                  onClick={() => setActiveTask({ ...activeTask, task_type: 'project' })}
                >Проект</button>
              </div>

              <input
                className="drawer-title-input"
                placeholder="Название задачи"
                value={activeTask?.title || ''}
                onChange={e => setActiveTask({ ...activeTask, title: e.target.value })}
              />

              <div className="drawer-meta">
                <div className="meta-item">
                  <label>Приоритет</label>
                  <select value={activeTask?.priority || 'low'} onChange={e => setActiveTask({ ...activeTask, priority: e.target.value })}>
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div className="meta-item">
                  <label>Дедлайн</label>
                  <input type="datetime-local" value={activeTask?.deadline || ''} onChange={e => setActiveTask({ ...activeTask, deadline: e.target.value })} />
                </div>
              </div>

              <div className="drawer-section">
                <label>Теги</label>
                <div className="tags-picker">
                  <div className="task-tags-row" style={{ marginBottom: 8 }}>
                    {activeTask?.tags?.map(tag => (
                      <span key={tag.id} className="tag-badge removable" style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>
                        {tag.name}
                        <button className="tag-remove" onClick={() => onRemoveTaskTag(activeTask.id, tag.id)}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="tags-select-row" style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="tag-create-input"
                      placeholder="Новый тег..."
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                      style={{ flex: 1 }}
                    />
                    <button className="tag-create-btn" onClick={handleCreateTag}>+</button>
                    <div className="presets-wrapper" style={{ position: 'relative' }}>
                      <button className="tag-presets-btn" onClick={() => setShowPresets(!showPresets)}>Пресеты ▾</button>
                      {showPresets && (
                        <div className="presets-dropdown">
                          {TAG_PRESETS.map(p => (
                            <button key={p.name} className="preset-option" onClick={() => handlePresetTag(p)}>
                              <span className="preset-dot" style={{ background: p.color }}></span>
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="view-type-badge">{typeLabel[activeTask?.task_type] || 'Быстрая'}</div>
              <h2 className="view-title">{activeTask?.title || 'Без названия'}</h2>

              <div className="view-meta">
                <div className="view-meta-item">
                  <span className="view-meta-label">Приоритет</span>
                  <span className={`view-priority ${activeTask?.priority}`}>{priorityLabel[activeTask?.priority] || 'Низкий'}</span>
                </div>
                {activeTask?.deadline && (
                  <div className="view-meta-item">
                    <span className="view-meta-label">Дедлайн</span>
                    <span className="view-deadline">{new Date(activeTask.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {activeTask?.tags?.length > 0 && (
                  <div className="view-meta-item">
                    <span className="view-meta-label">Теги</span>
                    <div className="task-tags-row">
                      {activeTask.tags.map(tag => (
                        <span key={tag.id} className="tag-badge" style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>{tag.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeTask?.task_type === 'project' && activeTask?.subtasks?.length > 0 && (
                <div className="drawer-subtasks view-subtasks">
                  <label>Подзадачи</label>
                  <div className="subtask-list">
                    {activeTask.subtasks.map(st => (
                      <div key={st.id} className="subtask-item">
                        <input type="checkbox" checked={st.is_completed} onChange={() => toggleSubtask(st.id, st.is_completed)} />
                        <span className={st.is_completed ? 'completed' : ''} style={{ flex: 1 }}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTask?.description && (
                <div className="drawer-section">
                  <label>Описание</label>
                  <p className="view-description">{activeTask.description}</p>
                </div>
              )}
            </>
          )}

          {isEditing && activeTask?.task_type === 'project' && (
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

          {isEditing && (
            <div className="drawer-section">
              <textarea
                className="drawer-description"
                placeholder="Добавьте детали..."
                value={activeTask?.description || ''}
                onChange={e => setActiveTask({ ...activeTask, description: e.target.value })}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
