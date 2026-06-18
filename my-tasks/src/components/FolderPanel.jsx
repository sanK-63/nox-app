import React, { useState, useEffect, useCallback } from 'react';

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

function flattenTree(roots, depth = 0) {
  const result = [];
  for (const f of roots) {
    result.push({ ...f, depth });
    result.push(...flattenTree(f.children, depth + 1));
  }
  return result;
}

export default function FolderPanel({ selectedFolderId, onSelectFolder, allNotesCount }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

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
        if (selectedFolderId === id) onSelectFolder(null);
        await loadFolders();
      }
    } catch (e) {
      console.error('Failed to delete folder', e);
    }
  };

  const tree = buildTree(folders);
  const flat = flattenTree(tree);

  return (
    <div className="folder-panel">
      <div className="folder-header">
        <span className="folder-title">Папки</span>
        <button className="folder-add-btn" onClick={() => { setCreating(true); setNewName(''); }} title="Создать папку">+</button>
      </div>
      <div className="folder-list">
        <div
          className={`folder-item ${!selectedFolderId ? 'active' : ''}`}
          onClick={() => onSelectFolder(null)}
        >
          <span className="folder-icon">📁</span>
          <span className="folder-name">Все заметки</span>
          <span className="folder-count">{allNotesCount}</span>
        </div>
        {creating && (
          <div className="folder-item folder-creating">
            <span className="folder-icon">📁</span>
            <input
              className="folder-input"
              autoFocus
              placeholder="Название папки..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              onBlur={handleCreate}
            />
          </div>
        )}
        {flat.map(f => {
          const count = f._count || 0;
          const isRenaming = renaming === f.id;
          return (
            <div
              key={f.id}
              className={`folder-item ${selectedFolderId === f.id ? 'active' : ''}`}
              style={{ paddingLeft: 16 + (f.depth || 0) * 16 }}
              onClick={() => onSelectFolder(f.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, folder: f });
              }}
            >
              <span className="folder-icon">{f.depth > 0 ? '📂' : '📁'}</span>
              {isRenaming ? (
                <input
                  className="folder-input"
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setRenaming(null); }}
                  onBlur={() => handleRename(f.id)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="folder-name">{f.name}</span>
              )}
            </div>
          );
        })}
        {!loading && folders.length === 0 && !creating && (
          <div className="folder-empty">Нет папок</div>
        )}
      </div>
      {contextMenu && (
        <div className="note-context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 9999 }}>
          <div className="note-context-item" onClick={(e) => {
            e.stopPropagation();
            setRenaming(contextMenu.folder.id);
            setRenameValue(contextMenu.folder.name);
            setContextMenu(null);
          }}>
            ✏️ Переименовать
          </div>
          <div className="note-context-item danger" onClick={(e) => {
            e.stopPropagation();
            handleDelete(contextMenu.folder.id);
            setContextMenu(null);
          }}>
            🗑 Удалить
          </div>
        </div>
      )}
    </div>
  );
}
