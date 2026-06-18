const { contextBridge, ipcRenderer } = require('electron');

// Forward backend logs to renderer console
ipcRenderer.on('notes:log', (_event, msg) => {
  console.log(`[ipc] ${msg}`);
});

contextBridge.exposeInMainWorld('api', {
  // ===== Legacy (обратная совместимость) =====
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  addTask: (task) => ipcRenderer.invoke('add-task', task),
  toggleTask: (data) => ipcRenderer.invoke('toggle-task', data),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
  addSubtask: (data) => ipcRenderer.invoke('add-subtask', data),
  toggleSubtask: (data) => ipcRenderer.invoke('toggle-subtask', data),
  deleteSubtask: (id) => ipcRenderer.invoke('delete-subtask', id),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveAttachment: (data) => ipcRenderer.invoke('save-attachment', data),
  getAttachments: (taskId) => ipcRenderer.invoke('get-attachments', taskId),
  getTags: () => ipcRenderer.invoke('get-tags'),
  addTag: (data) => ipcRenderer.invoke('add-tag', data),
  deleteTag: (id) => ipcRenderer.invoke('delete-tag', id),
  addTaskTag: (data) => ipcRenderer.invoke('add-task-tag', data),
  removeTaskTag: (data) => ipcRenderer.invoke('remove-task-tag', data),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  getNote: (id) => ipcRenderer.invoke('get-note', id),
  addNote: (data) => ipcRenderer.invoke('add-note', data),
  updateNote: (data) => ipcRenderer.invoke('update-note', data),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
  getBacklinks: (noteId) => ipcRenderer.invoke('get-backlinks', noteId),
  addNoteTask: (data) => ipcRenderer.invoke('add-note-task', data),
  removeNoteTask: (data) => ipcRenderer.invoke('remove-note-task', data),
  getNoteTasks: (noteId) => ipcRenderer.invoke('get-note-tasks', noteId),
  nox: {
    auth: () => ipcRenderer.invoke('nox:auth'),
    sync: () => ipcRenderer.invoke('nox:sync'),
    getSyncStatus: () => ipcRenderer.invoke('nox:getSyncStatus'),
    listFolders: () => ipcRenderer.invoke('nox:listFolders'),
    setBackupFolder: (folderId) => ipcRenderer.invoke('nox:setBackupFolder', folderId),
    restore: () => ipcRenderer.invoke('nox:restore'),
  },

  // ===== Notes v2 API =====
  notes: {
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    getById: (id) => ipcRenderer.invoke('notes:getById', id),
    save: (data) => ipcRenderer.invoke('notes:save', data),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    search: (q) => ipcRenderer.invoke('notes:search', q),
    searchByTitle: (title) => ipcRenderer.invoke('notes:searchByTitle', title),
    getBacklinks: (id) => ipcRenderer.invoke('notes:getBacklinks', id),
    getLinkedTasks: (noteId) => ipcRenderer.invoke('notes:getLinkedTasks', noteId),
    getGraph: () => ipcRenderer.invoke('notes:getGraph'),
    linkTask: (noteId, taskId) => ipcRenderer.invoke('notes:linkTask', { noteId, taskId }),
    unlinkTask: (noteId, taskId) => ipcRenderer.invoke('notes:unlinkTask', { noteId, taskId }),
    togglePin: (id) => ipcRenderer.invoke('notes:togglePin', id),
    batchDelete: (ids) => ipcRenderer.invoke('notes:batchDelete', ids),
    getByTag: (tag) => ipcRenderer.invoke('notes:getByTag', tag),
    duplicate: (id) => ipcRenderer.invoke('notes:duplicate', id),
  },

  // ===== Tasks API =====
  tasks: {
    list: () => ipcRenderer.invoke('get-tasks'),
    toggle: (data) => ipcRenderer.invoke('toggle-task', data),
    delete: (id) => ipcRenderer.invoke('delete-task', id),
    getByNote: (noteId) => ipcRenderer.invoke('get-note-tasks', noteId),
    create: (data) => ipcRenderer.invoke('tasks:create', data),
    update: (data) => ipcRenderer.invoke('tasks:update', data),
  },

  // ===== Tags API =====
  tags: {
    list: () => ipcRenderer.invoke('tags:list'),
    create: (data) => ipcRenderer.invoke('add-tag', data),
    delete: (id) => ipcRenderer.invoke('delete-tag', id),
    addToTask: (data) => ipcRenderer.invoke('add-task-tag', data),
    removeFromTask: (data) => ipcRenderer.invoke('remove-task-tag', data),
  },

  // ===== Folders API =====
  folders: {
    list: () => ipcRenderer.invoke('folders:list'),
    create: (data) => ipcRenderer.invoke('folders:create', data),
    rename: (data) => ipcRenderer.invoke('folders:rename', data),
    delete: (id) => ipcRenderer.invoke('folders:delete', id),
    moveNote: (noteId, folderId) => ipcRenderer.invoke('folders:moveNote', { noteId, folderId }),
    move: (id, parent_id) => ipcRenderer.invoke('folders:move', { id, parent_id }),
  },
});