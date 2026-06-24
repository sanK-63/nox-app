import React, { useState, useEffect, useCallback, useMemo } from 'react';

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTree(folders) {
  const map = new Map();
  const roots = [];
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }
  for (const f of map.values()) {
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id).children.push(f);
    } else {
      roots.push(f);
    }
  }
  return roots;
}

export default function FolderPanel({
  notes, activeNoteId, onSelectNote, allNotesCount,
  search, filteredFolder, onSelectFolder, onNoteChanged,
}) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [expanded, setExpanded] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('nox:expandedFolders') || '[]')); }
    catch { return new Set(); }
  });

  const persistExpanded = (next) => {
    try { localStorage.setItem('nox:expandedFolders', JSON.stringify([...next])); } catch {}
  };

  const toggleExpanded = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persistExpanded(next);
      return next;
    });
  };

  const loadFolders = useCallback(async () => {
    try {
      if (window.api?.folders?.list) {
        const data = await window.api.folders.list();
        setFolders(data);
      }
    } catch (e) {
      console.error('Failed to load folders', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    try {
      if (window.api?.folders?.create) {
        await window.api.folders.create({ name });
        await loadFolders();
      }
    } catch (e) {
      console.error('Failed to create folder', e);
    }
    setNewName('');
    setCreating(false);
  };

  const handleRename = async (id) => {
    const name = renameValue.trim();
    if (!name) { setRenaming(null); return; }
    try {
      if (window.api?.folders?.rename) {
        await window.api.folders.rename({ id, name });
        await loadFolders();
      }
    } catch (e) {
      console.error('Failed to rename folder', e);
    }
    setRenaming(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить папку? Заметки останутся без папки.')) return;
    try {
      if (window.api?.folders?.delete) {
        await window.api.folders.delete(id);
        if (filteredFolder === id) onSelectFolder(null);
        await loadFolders();
      }
    } catch (e) {
      console.error('Failed to delete folder', e);
    }
  };

  // Group notes by folder_id
  const grouped = useMemo(() => {
    const pinned = [];
    const byFolder = {};
    const unfiled = [];
    for (const n of notes) {
      if (n.is_pinned) { pinned.push(n); continue; }
      if (n.folder_id) {
        if (!byFolder[n.folder_id]) byFolder[n.folder_id] = [];
        byFolder[n.folder_id].push(n);
      } else {
        unfiled.push(n);
      }
    }
    return { pinned, byFolder, unfiled };
  }, [notes]);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const q = search?.toLowerCase().trim() || '';

  const renderNoteItem = (note) => {
    const isActive = activeNoteId === note.id;
    return (
      <div
        key={note.id}
        className={`tree-note-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelectNote(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, note });
        }}
      >
        <div className="tree-note-color" style={{ background: note.color }} />
        <div className="tree-note-info">
          <span className="tree-note-title">{escapeHtml(note.title)}</span>
          <span className="tree-note-date">
            {new Date(note.updated_at || note.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    );
  };

  const renderFolder = (f, depth = 0) => {
    const folderNotes = grouped.byFolder[f.id] || [];
    const isOpen = expanded.has(f.id);
    const isActive = filteredFolder === f.id;
    const hasNotes = folderNotes.length > 0;

    return (
      <React.Fragment key={f.id}>
        <div
          className={`tree-folder ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => onSelectFolder(f.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, folder: f });
          }}
        >
          <span
            className={`tree-folder-chevron ${hasNotes ? '' : 'invisible'}`}
            onClick={(e) => { e.stopPropagation(); toggleExpanded(f.id); }}
          >
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="tree-folder-icon">{depth > 0 ? '📂' : '📁'}</span>
          {renaming === f.id ? (
            <input
              className="folder-input tree-folder-rename"
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setRenaming(null); }}
              onBlur={() => handleRename(f.id)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="tree-folder-name">{f.name}</span>
          )}
          <span className="tree-folder-count">{folderNotes.length}</span>
        </div>
        {isOpen && folderNotes.map(n => renderNoteItem(n))}
        {isOpen && !q && folderNotes.length === 0 && (
          <div className="tree-folder-empty" style={{ paddingLeft: 40 + depth * 16 }}>нет заметок</div>
        )}
        {f.children?.map(child => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  // Filter notes that match search (across all)
  const matchingNotes = q
    ? notes.filter(n => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q))
    : [];

  return (
    <div className="folder-panel">
      <div className="folder-header">
        <span className="folder-title">Папки</span>
        <button className="folder-add-btn" onClick={() => { setCreating(true); setNewName(''); }} title="Создать папку">+</button>
      </div>

      <div className="folder-tree">
        {/* Все заметки */}
        <div
          className={`tree-folder ${!filteredFolder && !q ? 'active' : ''}`}
          onClick={() => { onSelectFolder(null); }}
        >
          <span className="tree-folder-chevron invisible">▶</span>
          <span className="tree-folder-icon">📁</span>
          <span className="tree-folder-name">Все заметки</span>
          <span className="tree-folder-count">{allNotesCount}</span>
        </div>

        {/* Pinned notes (always visible when no folder filter) */}
        {!filteredFolder && !q && grouped.pinned.length > 0 && (
          <div className="tree-section-label">Закреплённые</div>
        )}
        {!filteredFolder && !q && grouped.pinned.map(n => renderNoteItem(n))}

        {/* Create folder input */}
        {creating && (
          <div className="tree-folder" style={{ paddingLeft: 12 }}>
            <span className="tree-folder-chevron invisible">▶</span>
            <span className="tree-folder-icon">📁</span>
            <input
              className="folder-input tree-folder-rename"
              autoFocus
              placeholder="Название папки..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              onBlur={handleCreate}
            />
          </div>
        )}

        {/* Folders tree */}
        {tree.map(f => renderFolder(f))}

        {/* Search results */}
        {q && matchingNotes.length > 0 && (
          <>
            <div className="tree-section-label">Результаты поиска</div>
            {matchingNotes.map(n => renderNoteItem(n))}
          </>
        )}

        {/* Unfiled notes */}
        {!q && !filteredFolder && grouped.unfiled.length > 0 && (
          <>
            <div className="tree-section-label">Без папки</div>
            {grouped.unfiled.map(n => renderNoteItem(n))}
          </>
        )}

        {/* Empty state */}
        {!loading && folders.length === 0 && !creating && !q && notes.length === 0 && (
          <div className="folder-empty">Нет заметок</div>
        )}
      </div>

      {contextMenu && (
        <div className="note-context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}>
          {contextMenu.folder && (
            <>
              <div className="note-context-item" onClick={(e) => {
                e.stopPropagation();
                setRenaming(contextMenu.folder.id);
                setRenameValue(contextMenu.folder.name);
                setContextMenu(null);
              }}>✏️ Переименовать</div>
              <div className="note-context-item danger" onClick={(e) => {
                e.stopPropagation();
                handleDelete(contextMenu.folder.id);
                setContextMenu(null);
              }}>🗑 Удалить</div>
            </>
          )}
          {contextMenu.note && (
            <>
              <div className="note-context-item" onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (window.api?.notes?.togglePin) {
                    await window.api.notes.togglePin(contextMenu.note.id);
                    if (onNoteChanged) onNoteChanged();
                  }
                } catch {}
                setContextMenu(null);
              }}>📌 Закрепить</div>
              <div className="note-context-item danger" onClick={async (e) => {
                e.stopPropagation();
                if (!confirm('Удалить заметку?')) return;
                try {
                  if (window.api?.deleteNote) {
                    await window.api.deleteNote(contextMenu.note.id);
                    if (onNoteChanged) onNoteChanged();
                  }
                } catch {}
                setContextMenu(null);
              }}>🗑 Удалить</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
