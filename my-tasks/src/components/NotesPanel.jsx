import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import FolderPanel from './FolderPanel';
import { showToast } from './Toast';

const NOTE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const SIDEBAR_WIDTH_KEY = 'nox:sidebarWidth';
const ACTIVE_NOTE_KEY = 'nox:activeNoteId';

function loadNumber(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? Number(v) : fallback; } catch { return fallback; }
}
function saveNumber(key, val) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

export default function NotesPanel({ tasks }) {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(() => {
    try { return Number(localStorage.getItem(ACTIVE_NOTE_KEY)) || null; } catch { return null; }
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => loadNumber(SIDEBAR_WIDTH_KEY, 280));
  const [contextMenu, setContextMenu] = useState(null);
  const [filteredFolder, setFilteredFolder] = useState(null);
  const resizing = useRef(false);

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      if (window.api?.getNotes) {
        const data = await window.api.getNotes();
        setNotes(data);
        return data;
      }
      return [];
    } catch (e) {
      showToast('Ошибка загрузки заметок');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes().then(data => {
      if (data.length > 0 && !activeNoteId) {
        const id = data[0].id;
        setActiveNoteId(id);
        saveNumber(ACTIVE_NOTE_KEY, id);
      }
    });
  }, []);

  useEffect(() => {
    if (activeNoteId) saveNumber(ACTIVE_NOTE_KEY, activeNoteId);
  }, [activeNoteId]);

  const handleNoteCreated = useCallback(async (noteId) => {
    await loadNotes();
    setActiveNoteId(noteId);
    saveNumber(ACTIVE_NOTE_KEY, noteId);
  }, [loadNotes]);

  const refreshNote = useCallback(async (id) => {
    if (!id) return;
    try {
      if (window.api?.getNote) {
        const updated = await window.api.getNote(id);
        if (updated) {
          setNotes(prev => prev.map(n => n.id === id ? { ...n, title: updated.title, content: updated.content, is_pinned: updated.is_pinned, color: updated.color, updated_at: updated.updated_at } : n));
        }
      }
    } catch (e) {
      showToast('Ошибка обновления заметки');
    }
  }, []);

  const activeNote = useMemo(() => {
    if (!activeNoteId) return null;
    return notes.find(n => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (filteredFolder) {
      list = list.filter(n => n.folder_id === filteredFolder);
    }
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, search, filteredFolder]);

  // Virtual scroll
  const [visibleCount, setVisibleCount] = useState(30);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 20, filteredNotes.length));
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredNotes.length]);

  useEffect(() => {
    setVisibleCount(30);
  }, [search]);

  const handleCreate = async () => {
    try {
      if (window.api?.addNote) {
        const result = await window.api.addNote({ title: 'Новая заметка', content: '' });
        if (result?.id) {
          setActiveNoteId(result.id);
          await loadNotes();
        }
      }
    } catch (e) {
      showToast('Ошибка создания заметки');
    }
  };

  const handleDelete = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Удалить заметку?')) return;
    try {
      if (window.api?.deleteNote) {
        await window.api.deleteNote(id);
        if (activeNoteId === id) setActiveNoteId(null);
        await loadNotes();
      }
    } catch (e) {
      showToast('Ошибка удаления заметки');
    }
  }, [activeNoteId]);

  const handleTogglePin = async (id, current, e) => {
    if (e) e.stopPropagation();
    try {
      if (window.api?.updateNote) {
        await window.api.updateNote({ id, is_pinned: !current });
        await loadNotes();
      }
    } catch (e) {
      showToast('Ошибка изменения заметки');
    }
  };

  const handleSelectNote = useCallback(async (id) => {
    setActiveNoteId(id);
    await refreshNote(id);
  }, [refreshNote]);

  const handleDuplicate = async (id) => {
    try {
      if (window.api?.notes?.duplicate) {
        const dup = await window.api.notes.duplicate(id);
        if (dup?.id) {
          await loadNotes();
          setActiveNoteId(dup.id);
        }
      }
    } catch (e) {
      showToast('Ошибка дублирования');
    }
  };

  const handleMoveToFolder = async (noteId) => {
    try {
      if (window.api?.folders?.list) {
        const folders = await window.api.folders.list();
        const choice = prompt('ID папки для перемещения (0 — убрать из папки):\n' +
          folders.map(f => `${f.id}: ${f.name}`).join('\n'));
        if (choice === null) return;
        const folderId = parseInt(choice);
        if (isNaN(folderId) || folderId === 0) {
          await window.api.folders.moveNote(noteId, null);
        } else {
          await window.api.folders.moveNote(noteId, folderId);
        }
        await loadNotes();
      }
    } catch (e) {
      showToast('Ошибка перемещения');
    }
  };

  const handleContextMenu = (e, note) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    const click = () => setContextMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('click', click);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('click', click);
    };
  }, []);

  // Resizable sidebar
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const handleMouseMove = (ev) => {
      if (!resizing.current) return;
      const newW = Math.max(180, Math.min(500, startW + ev.clientX - startX));
      setSidebarWidth(newW);
      saveNumber(SIDEBAR_WIDTH_KEY, newW);
    };
    const handleMouseUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  if (isLoading && notes.length === 0) {
    return (
      <div className="notes-loading">
        <div className="spinner"></div>
        <span>Загрузка заметок...</span>
      </div>
    );
  }

  return (
    <div className="notes-layout">
      <div className="notes-sidebar" style={{ width: sidebarWidth, minWidth: 180, maxWidth: 500 }}>
        <FolderPanel
          selectedFolderId={filteredFolder}
          onSelectFolder={setFilteredFolder}
          allNotesCount={notes.length}
        />
        <div className="notes-sidebar-header">
          <span className="notes-count">{filteredNotes.length} заметок</span>
          <button className="add-note-btn" onClick={handleCreate}>+</button>
        </div>
        <input className="notes-search" placeholder="Поиск заметок..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="notes-list">
          {filteredNotes.slice(0, visibleCount).map(note => (
            <div
              key={note.id}
              className={`note-list-item ${activeNoteId === note.id ? 'active' : ''}`}
              onClick={() => handleSelectNote(note.id)}
              onContextMenu={(e) => handleContextMenu(e, note)}
            >
              <div className="note-list-color" style={{ background: note.color }}></div>
              <div className="note-list-info">
                <span className="note-list-title">{note.title}</span>
                <span className="note-list-date">
                  {new Date(note.updated_at || note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="note-list-actions">
                <button className={`note-pin-btn ${note.is_pinned ? 'pinned' : ''}`} onClick={(e) => handleTogglePin(note.id, note.is_pinned, e)} title={note.is_pinned ? 'Открепить' : 'Закрепить'}>📌</button>
                <button className="note-del-btn" onClick={(e) => handleDelete(note.id, e)}>✕</button>
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && <div className="notes-empty">Нет заметок</div>}
          {visibleCount < filteredNotes.length && <div ref={sentinelRef} className="notes-list-sentinel" />}
        </div>
      </div>

      <div className="notes-resize-handle" onMouseDown={handleResizeStart} />

      <div className="notes-editor-area">
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            notes={notes}
            onSave={async (data) => {
              try {
                if (window.api?.notes?.save) {
                  const result = await window.api.notes.save(data);
                  if (result?.conflict) {
                    const overwrite = confirm(
                      `Заметка была изменена в другом окне.\n\nЗаголовок: ${result.serverNote.title}\n\nНажать OK — перезаписать, Отмена — загрузить версию с сервера.`
                    );
                    if (overwrite) {
                      await window.api.notes.save({ id: data.id, title: data.title, content: data.content });
                    } else {
                      setActiveNoteId(result.serverNote.id);
                    }
                  }
                } else if (window.api?.updateNote) {
                  await window.api.updateNote(data);
                }
                await loadNotes();
                if (activeNote) await refreshNote(activeNote.id);
              } catch (e) {
                showToast('Ошибка сохранения');
              }
            }}
            tasks={tasks}
            onNavigateToNote={handleSelectNote}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onTogglePin={handleTogglePin}
            onCreateNote={handleNoteCreated}
          />
        ) : (
          <div className="notes-editor-empty">
            <div className="notes-editor-empty-text">Выберите или создайте заметку</div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div className="note-context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}
          onClick={() => setContextMenu(null)}>
          <div className="note-context-item" onClick={(e) => { e.stopPropagation(); handleTogglePin(contextMenu.note.id, contextMenu.note.is_pinned); setContextMenu(null); }}>
            {contextMenu.note.is_pinned ? '📌 Открепить' : '📌 Закрепить'}
          </div>
          <div className="note-context-item" onClick={(e) => { e.stopPropagation(); handleDuplicate(contextMenu.note.id); setContextMenu(null); }}>
            📋 Дублировать
          </div>
          <div className="note-context-item" onClick={(e) => { e.stopPropagation(); handleMoveToFolder(contextMenu.note.id); setContextMenu(null); }}>
            📂 Переместить в папку...
          </div>
          <div className="note-context-item danger" onClick={(e) => { e.stopPropagation(); handleDelete(contextMenu.note.id); setContextMenu(null); }}>
            🗑 Удалить
          </div>
        </div>
      )}
    </div>
  );
}

function NoteEditor({ note, onSave, tasks, notes, onNavigateToNote, onDelete, onDuplicate, onTogglePin, onCreateNote }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || NOTE_COLORS[0]);
  const [isPreview, setIsPreview] = useState(false);
  const [backlinks, setBacklinks] = useState([]);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [wikiSuggestions, setWikiSuggestions] = useState([]);
  const [wikiIndex, setWikiIndex] = useState(-1);
  const saveTimer = useRef(null);
  const titleRef = useRef(note.title);
  const contentRef = useRef(note.content);
  const colorRef = useRef(note.color || NOTE_COLORS[0]);
  const textareaRef = useRef(null);
  const [taskTab, setTaskTab] = useState('linked');
  const [taskSearch, setTaskSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || NOTE_COLORS[0]);
    titleRef.current = note.title;
    contentRef.current = note.content;
    colorRef.current = note.color || NOTE_COLORS[0];
    setSaveStatus('idle');
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, [note.id, note.title, note.content, note.color]);

  useEffect(() => {
    if (window.api?.getBacklinks) {
      window.api.getBacklinks(note.id).then(setBacklinks).catch(() => {});
    }
    if (window.api?.getNoteTasks) {
      window.api.getNoteTasks(note.id).then(setLinkedTasks).catch(() => {});
    }
  }, [note.id]);

  const lastSavedRef = useRef({ title: note.title, content: note.content, color: note.color });

  useEffect(() => {
    lastSavedRef.current = { title: note.title, content: note.content, color: note.color };
  }, [note.id, note.title, note.content, note.color]);

  const doSave = useCallback(async (data) => {
    const unchanged = data.title === lastSavedRef.current.title
      && data.content === lastSavedRef.current.content
      && data.color === lastSavedRef.current.color;
    if (unchanged) return;
    setSaveStatus('saving');
    try {
      await onSave(data);
      lastSavedRef.current = { title: data.title, content: data.content, color: data.color };
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
  }, [onSave]);

  const saveCurrent = useCallback((immediate) => {
    const data = {
      id: note.id,
      title: titleRef.current,
      content: contentRef.current,
      color: colorRef.current,
      expected_updated_at: note.updated_at,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) {
      doSave(data);
    } else {
      saveTimer.current = setTimeout(() => doSave(data), 500);
    }
  }, [note.id, note.updated_at, doSave]);

  const handleChange = (field, value) => {
    if (field === 'title') { setTitle(value); titleRef.current = value; }
    if (field === 'content') { setContent(value); contentRef.current = value; }
    if (field === 'color') { setColor(value); colorRef.current = value; }
    saveCurrent(false);
  };

  const handleContentChange = (e) => {
    const value = e.target.value;
    setContent(value);
    contentRef.current = value;
    saveCurrent(false);

    // Wiki-link autocomplete: detect [[ and show suggestions
    const caretPos = e.target.selectionStart;
    const beforeCaret = value.slice(0, caretPos);
    const openIdx = beforeCaret.lastIndexOf('[[');
    if (openIdx !== -1 && beforeCaret.slice(openIdx).indexOf(']]') === -1) {
      const partial = beforeCaret.slice(openIdx + 2);
      if (notes && partial.length > 0) {
        const suggestions = notes
          .filter(n => n.id !== note.id && n.title.toLowerCase().includes(partial.toLowerCase()))
          .slice(0, 6);
        setWikiSuggestions(suggestions.map(n => n.title));
        setWikiIndex(-1);
        return;
      }
    }
    setWikiSuggestions([]);
    setWikiIndex(-1);
  };

  const insertWikiLink = (title) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = contentRef.current;
    const caretPos = ta.selectionStart;
    const beforeCaret = val.slice(0, caretPos);
    const openIdx = beforeCaret.lastIndexOf('[[');
    if (openIdx === -1) return;
    const afterOpen = val.slice(openIdx + 2);
    const closeIdx = afterOpen.indexOf(']]');
    const endIdx = closeIdx !== -1 ? openIdx + 2 + closeIdx + 2 : caretPos;
    const newContent = val.slice(0, openIdx) + `[[${title}]]` + val.slice(endIdx);
    contentRef.current = newContent;
    setContent(newContent);
    setWikiSuggestions([]);
    setWikiIndex(-1);
    saveCurrent(false);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(openIdx + title.length + 4, openIdx + title.length + 4);
    }, 0);
  };

  const handleWikiKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (wikiSuggestions.length > 0) {
        e.preventDefault();
        setWikiIndex(prev => Math.min(prev + 1, wikiSuggestions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      if (wikiSuggestions.length > 0) {
        e.preventDefault();
        setWikiIndex(prev => Math.max(prev - 1, 0));
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (wikiIndex >= 0 && wikiIndex < wikiSuggestions.length) {
        e.preventDefault();
        insertWikiLink(wikiSuggestions[wikiIndex]);
      } else if (e.key === 'Enter' && !e.shiftKey && wikiSuggestions.length === 0) {
        const ta = textareaRef.current;
        if (ta) {
          const beforeCaret = contentRef.current.slice(0, ta.selectionStart);
          const openIdx = beforeCaret.lastIndexOf('[[');
          if (openIdx !== -1 && beforeCaret.slice(openIdx).indexOf(']]') === -1) {
            const partial = beforeCaret.slice(openIdx + 2).trim();
            if (partial.length > 0) {
              e.preventDefault();
              insertWikiLink(partial);
              if (window.api?.addNote && onCreateNote) {
                window.api.addNote({ title: partial, content: '' })
                  .then(r => { if (r?.id) onCreateNote(r.id); })
                  .catch(() => showToast('Ошибка создания заметки'));
              }
            }
          }
        }
      }
    } else if (e.key === 'Escape') {
      setWikiSuggestions([]);
      setWikiIndex(-1);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleSaveImmediate = () => saveCurrent(true);

  const handleWikiLink = async (linkTitle) => {
    const found = notes.find(n => n.title.toLowerCase() === linkTitle.toLowerCase());
    if (found && onNavigateToNote) {
      onNavigateToNote(found.id);
    } else if (window.api?.addNote && onCreateNote) {
      try {
        const result = await window.api.addNote({ title: linkTitle, content: '' });
        if (result?.id) {
          onCreateNote(result.id);
          showToast(`Создана заметка «${linkTitle}»`);
        }
      } catch (e) {
        showToast('Ошибка создания заметки');
      }
    }
  };

  const handleToggleCheckbox = (newContent) => {
    setContent(newContent);
    contentRef.current = newContent;
    saveCurrent(false);
  };

  const handleTextareaClick = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = contentRef.current;
    if (!val) return;
    const before = val.slice(0, pos);
    const openIdx = before.lastIndexOf('[[');
    if (openIdx === -1) return;
    const after = val.slice(openIdx + 2);
    const closeIdx = after.indexOf(']]');
    if (closeIdx === -1 || openIdx + 2 + closeIdx < pos) return;
    const title = after.slice(0, closeIdx).split('|')[0].trim();
    if (!title) return;
    e.preventDefault();
    handleWikiLink(title);
  };

  const unlinkedTasks = useMemo(() => {
    if (!tasks) return [];
    const linkedIds = new Set(linkedTasks.map(t => t.id));
    return tasks.filter(t => !linkedIds.has(t.id) && !t.is_completed);
  }, [tasks, linkedTasks]);

  const handleLinkTask = async (taskId) => {
    if (window.api?.addNoteTask) {
      await window.api.addNoteTask({ note_id: note.id, task_id: taskId });
      const updated = await window.api.getNoteTasks(note.id);
      setLinkedTasks(updated || []);
      setShowTaskPicker(false);
    }
  };

  const handleUnlinkTask = async (taskId) => {
    if (window.api?.removeNoteTask) {
      await window.api.removeNoteTask({ note_id: note.id, task_id: taskId });
      setLinkedTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('task/id', String(taskId));
    e.dataTransfer.effectAllowed = 'link';
  };

  const handleDragOverDropZone = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
  };

  const handleDropOnZone = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('task/id');
    if (taskId) {
      await handleLinkTask(Number(taskId));
    }
  };

  const searchedTasks = useMemo(() => {
    if (!tasks) return [];
    const q = taskSearch.toLowerCase().trim();
    if (!q) return [];
    const linkedIds = new Set(linkedTasks.map(t => t.id));
    return tasks.filter(t => !linkedIds.has(t.id) && !t.is_completed && t.title.toLowerCase().includes(q));
  }, [tasks, linkedTasks, taskSearch]);

  const allUnlinkedTasks = useMemo(() => {
    if (!tasks) return [];
    const linkedIds = new Set(linkedTasks.map(t => t.id));
    return tasks.filter(t => !linkedIds.has(t.id));
  }, [tasks, linkedTasks]);

  const saveStatusLabels = { idle: '', saving: 'Сохранение...', saved: 'Сохранено', error: 'Ошибка' };

  return (
    <div className="note-editor">
      <div className="note-editor-toolbar">
        <div className="note-editor-toolbar-left">
          {NOTE_COLORS.map(c => (
            <button key={c} className={`note-color-btn ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => handleChange('color', c)}></button>
          ))}
        </div>
        <div className="note-editor-toolbar-right">
          <span className={`note-save-status ${saveStatus}`}>{saveStatusLabels[saveStatus]}</span>
          <button className={`note-view-toggle ${!isPreview ? 'active' : ''}`} onClick={() => setIsPreview(false)}>Редактор</button>
          <button className={`note-view-toggle ${isPreview ? 'active' : ''}`} onClick={() => setIsPreview(true)}>Просмотр</button>
          <button className="note-save-btn" onClick={handleSaveImmediate}>Сохранить</button>
        </div>
      </div>

      <div className="note-editor-title-row">
        <input className="note-title-input" value={title} onChange={e => handleChange('title', e.target.value)} placeholder="Название заметки" />
      </div>

      <div className="note-editor-body" style={{ position: 'relative' }}>
        {isPreview ? (
          <div className="note-preview">
            <MarkdownRenderer content={content} onWikiLink={handleWikiLink} onToggleCheckbox={handleToggleCheckbox} />
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              className="note-content-input"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleWikiKeyDown}
              onMouseUp={handleTextareaClick}
              placeholder="Начните писать... Поддерживается Markdown и [[ссылки]] на другие заметки"
            />
            {wikiSuggestions.length > 0 && (
              <div className="note-wiki-autocomplete">
                {wikiSuggestions.map((s, i) => (
                  <div
                    key={s}
                    className={`note-wiki-item ${i === wikiIndex ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); insertWikiLink(s); }}
                  >
                    [[{s}]]
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="note-editor-footer">
        <div
          className={`note-linked-section ${isDragOver ? 'drag-over' : ''}`}
          onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setIsDragOver(false); }}
          onDragOver={handleDragOverDropZone}
          onDrop={handleDropOnZone}
        >
          <div className="note-section-header">
            <div className="note-section-tabs">
              <button className={`note-section-tab ${taskTab === 'linked' ? 'active' : ''}`} onClick={() => setTaskTab('linked')}>Связанные</button>
              <button className={`note-section-tab ${taskTab === 'all' ? 'active' : ''}`} onClick={() => setTaskTab('all')}>Все задачи</button>
            </div>
            <div className="note-section-actions">
              <button className="note-link-task-btn" onClick={() => setShowTaskPicker(!showTaskPicker)} title="Добавить задачу">+</button>
            </div>
          </div>

          <input className="note-task-search" placeholder="Поиск задач..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />

          {taskSearch && searchedTasks.length > 0 && (
            <div className="note-task-search-results">
              {searchedTasks.map(t => (
                <div key={t.id} className="note-task-option" draggable="true"
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => handleLinkTask(t.id)}
                >{t.title}</div>
              ))}
            </div>
          )}

          {taskTab === 'linked' ? (
            <>
              {showTaskPicker && unlinkedTasks.length > 0 && (
                <div className="note-task-picker">
                  {unlinkedTasks.map(t => (
                    <div key={t.id} className="note-task-option" draggable="true"
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => handleLinkTask(t.id)}
                    >{t.title}</div>
                  ))}
                </div>
              )}
              {linkedTasks.length > 0 ? (
                <div className="note-linked-tasks">
                  {linkedTasks.map(t => (
                    <div key={t.id} className="note-linked-task">
                      <span className={`note-linked-task-status ${t.is_completed ? 'done' : ''}`}>{t.is_completed ? '✓' : '○'}</span>
                      <span>{t.title}</span>
                      <button className="note-unlink-btn" onClick={() => handleUnlinkTask(t.id)}>✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="note-section-empty">Нет связанных задач</div>
              )}
            </>
          ) : (
            <div className="note-all-tasks">
              {allUnlinkedTasks.length > 0 ? allUnlinkedTasks.map(t => (
                <div key={t.id} className="note-task-option" draggable="true"
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  onClick={() => handleLinkTask(t.id)}
                >
                  <span className={`note-linked-task-status ${t.is_completed ? 'done' : ''}`}>{t.is_completed ? '✓' : '○'}</span>
                  <span>{t.title}</span>
                </div>
              )) : (
                <div className="note-section-empty">Все задачи уже связаны</div>
              )}
            </div>
          )}

          {isDragOver && <div className="note-drop-indicator">Перетащите задачу сюда</div>}
        </div>

        <div className="note-backlinks-section">
          <div className="note-section-header">
            <span>Обратные ссылки</span>
          </div>
          {backlinks.length > 0 ? (
            <div className="note-backlinks-list">
              {backlinks.map(bl => (
                <div key={bl.id || bl.source_note_id} className="note-backlink-item" onClick={() => handleWikiLink(bl.title || bl.source_title)}>
                  {bl.title || bl.source_title}
                </div>
              ))}
            </div>
          ) : (
            <div className="note-section-empty">Нет обратных ссылок</div>
          )}
        </div>
      </div>
    </div>
  );
}
