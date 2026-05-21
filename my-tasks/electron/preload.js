const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
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
  nox: {
    auth: () => ipcRenderer.invoke('nox:auth'),
    sync: () => ipcRenderer.invoke('nox:sync'),
    getSyncStatus: () => ipcRenderer.invoke('nox:getSyncStatus'),
    listFolders: () => ipcRenderer.invoke('nox:listFolders'),
    setBackupFolder: (folderId) => ipcRenderer.invoke('nox:setBackupFolder', folderId),
    restore: () => ipcRenderer.invoke('nox:restore'),
  },
});