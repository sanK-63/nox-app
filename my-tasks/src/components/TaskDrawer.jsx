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

  const saveTask = () => onSave(activeTask);

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
  const deadlineStr = activeTask?.deadline
    ? new Date(activeTask.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const isProject = activeTask?.task_type === 'project';
  const hasSubtasks = (activeTask?.subtasks?.length || 0) > 0;
  const hasTags = (activeTask?.tags?.length || 0) > 0;

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <aside className={`task-drawer ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="drawer-inner">
          <header className="drawer-header">
            <button className="close-drawer" onClick={onClose}>✕</button>
            <div className="drawer-header-right">
              {isEditing ? (
                <button className="save-task-btn" onClick={saveTask}>Сохранить</button>
              ) : (
                <button className="edit-task-btn" onClick={() => setIsEditing(true)}>Редактировать</button>
              )}
            </div>
          </header>

          {/* === TITLE & TYPE — same wrapper === */}
          <div className="drawer-title-area">
            <div className="title-type-row">
              {isEditing ? (
                <div className="task-type-toggle">
                  <button className={`type-btn ${activeTask?.task_type === 'quick' ? 'active' : ''}`}
                    onClick={() => setActiveTask({ ...activeTask, task_type: 'quick' })}>Быстрая</button>
                  <button className={`type-btn ${activeTask?.task_type === 'project' ? 'active' : ''}`}
                    onClick={() => setActiveTask({ ...activeTask, task_type: 'project' })}>Проект</button>
                </div>
              ) : (
                <div className="view-type-badge">{typeLabel[activeTask?.task_type] || 'Быстрая'}</div>
              )}
            </div>
            <div className="title-value-row">
              {isEditing ? (
                <input className="drawer-title-input" placeholder="Название задачи"
                  value={activeTask?.title || ''}
                  onChange={e => setActiveTask({ ...activeTask, title: e.target.value })} />
              ) : (
                <h2 className="view-title">{activeTask?.title || 'Без названия'}</h2>
              )}
            </div>
          </div>

          {/* === META (priority, deadline) — same grid wrapper === */}
          <div className="drawer-meta">
            <div className="meta-item">
              <label>Приоритет</label>
              {isEditing ? (
                <select value={activeTask?.priority || 'low'}
                  onChange={e => setActiveTask({ ...activeTask, priority: e.target.value })}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              ) : (
                <span className={`meta-value view-priority ${activeTask?.priority}`}>
                  {priorityLabel[activeTask?.priority] || 'Низкий'}
                </span>
              )}
            </div>
            <div className="meta-item">
              <label>Дедлайн</label>
              {isEditing ? (
                <input type="datetime-local" value={activeTask?.deadline || ''}
                  onChange={e => setActiveTask({ ...activeTask, deadline: e.target.value })} />
              ) : (
                <span className="meta-value view-deadline">
                  {activeTask?.deadline ? deadlineStr : 'Не указан'}
                </span>
              )}
            </div>
          </div>

          {/* === TAGS — always present === */}
          <div className="drawer-section">
            <label>Теги</label>
            {isEditing ? (
              <div className="tags-picker">
                <div className="task-tags-row" style={{ marginBottom: 8 }}>
                  {activeTask?.tags?.map(tag => (
                    <span key={tag.id} className="tag-badge removable"
                      style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>
                      {tag.name}
                      <button className="tag-remove" onClick={() => onRemoveTaskTag(activeTask.id, tag.id)}>✕</button>
                    </span>
                  ))}
                </div>
                <div className="tags-row">
                  <input className="tag-create-input" placeholder="Новый тег..."
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTag()} />
                  <button className="tag-create-btn" onClick={handleCreateTag}>+</button>
                  <div className="presets-wrapper">
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
            ) : (
              <div className="tags-view">
                {hasTags ? (
                  <div className="task-tags-row">
                    {activeTask.tags.map(tag => (
                      <span key={tag.id} className="tag-badge"
                        style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>{tag.name}</span>
                    ))}
                  </div>
                ) : (
                  <span className="meta-value tags-empty">Нет тегов</span>
                )}
              </div>
            )}
          </div>

          {/* === SUBTASKS — same wrapper, same presence logic === */}
          {isProject && (
            <div className="drawer-subtasks">
              <label>Подзадачи</label>
              {isEditing && (
                <div className="subtask-input-row">
                  <input placeholder="Новый пункт..." value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()} />
                  <button onClick={handleAddSubtask}>+</button>
                </div>
              )}
              {hasSubtasks ? (
                <div className="subtask-list">
                  {activeTask.subtasks.map(st => (
                    <div key={st.id} className="subtask-item">
                      <input type="checkbox" checked={st.is_completed}
                        onChange={() => toggleSubtask(st.id, st.is_completed)} />
                      <span className={st.is_completed ? 'completed' : ''} style={{ flex: 1 }}>{st.title}</span>
                      {isEditing && <button className="action-btn delete-btn" onClick={() => deleteSubtask(st.id)}>✕</button>}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="meta-value subtasks-empty">Нет подзадач</span>
              )}
            </div>
          )}

          {/* === DESCRIPTION — same wrapper === */}
          <div className="drawer-section drawer-section-grow">
            <label>Описание</label>
            {isEditing ? (
              <textarea className="drawer-description" placeholder="Добавьте детали..."
                value={activeTask?.description || ''}
                onChange={e => setActiveTask({ ...activeTask, description: e.target.value })} />
            ) : activeTask?.description ? (
              <p className="view-description">{activeTask.description}</p>
            ) : (
              <span className="meta-value desc-empty">Нет описания</span>
            )}
          </div>

        </div>
      </aside>
    </div>
  );
}
