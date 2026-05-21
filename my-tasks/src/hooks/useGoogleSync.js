import { useState, useEffect } from 'react';

export function useGoogleSync(loadTasks) {
  const [syncStatus, setSyncStatus] = useState({ isAuthenticated: false, isSyncing: false, isRestoring: false, lastSync: null, backupFolderId: null });
  const [folders, setFolders] = useState([]);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    if (window.api?.nox) {
      const status = await window.api.nox.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, isAuthenticated: status.isAuthenticated, backupFolderId: status.backupFolderId }));
    }
  };

  const handleAuth = async () => {
    if (window.api?.nox) {
      const result = await window.api.nox.auth();
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, isAuthenticated: true }));
        loadFolders();
      }
    }
  };

  const loadFolders = async () => {
    if (window.api?.nox) {
      const result = await window.api.nox.listFolders();
      if (result.success) {
        setFolders(result.folders);
        setIsFolderPickerOpen(true);
      }
    }
  };

  const selectFolder = async (folderId) => {
    if (window.api?.nox) {
      const result = await window.api.nox.setBackupFolder(folderId);
      if (result.success) {
        setSyncStatus(prev => ({ ...prev, backupFolderId: folderId }));
        setIsFolderPickerOpen(false);
      }
    }
  };

  const handleSync = async () => {
    if (window.api?.nox) {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      const result = await window.api.nox.sync();
      setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: result.success ? result.lastSync : prev.lastSync }));
    }
  };

  const handleRestore = async () => {
    if (!confirm('Вы уверены? Это действие заменит текущие задачи задачами из облака.')) return;
    if (window.api?.nox) {
      setSyncStatus(prev => ({ ...prev, isRestoring: true }));
      const result = await window.api.nox.restore();
      setSyncStatus(prev => ({ ...prev, isRestoring: false }));
      if (result.success && loadTasks) {
        loadTasks();
      }
    }
  };

  return { syncStatus, folders, isFolderPickerOpen, setIsFolderPickerOpen, handleAuth, selectFolder, handleSync, handleRestore };
}
