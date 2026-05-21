import { useState, useEffect } from 'react';

export function useGoogleSync(loadTasks) {
  const [syncStatus, setSyncStatus] = useState({ isAuthenticated: false, isSyncing: false, isRestoring: false, lastSync: null, backupFolderId: null });
  const [folders, setFolders] = useState([]);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    try {
      if (window.api?.nox) {
        const status = await window.api.nox.getSyncStatus();
        setSyncStatus(prev => ({ ...prev, isAuthenticated: status.isAuthenticated, backupFolderId: status.backupFolderId }));
      }
    } catch (e) {
      console.error('Failed to check sync status:', e);
    }
  };

  const handleAuth = async () => {
    try {
      if (window.api?.nox) {
        const result = await window.api.nox.auth();
        if (result.success) {
          setSyncStatus(prev => ({ ...prev, isAuthenticated: true }));
          loadFolders();
        }
      }
    } catch (e) {
      console.error('Failed to authenticate:', e);
    }
  };

  const loadFolders = async () => {
    try {
      if (window.api?.nox) {
        const result = await window.api.nox.listFolders();
        if (result.success) {
          setFolders(result.folders);
          setIsFolderPickerOpen(true);
        }
      }
    } catch (e) {
      console.error('Failed to load folders:', e);
    }
  };

  const selectFolder = async (folderId) => {
    try {
      if (window.api?.nox) {
        const result = await window.api.nox.setBackupFolder(folderId);
        if (result.success) {
          setSyncStatus(prev => ({ ...prev, backupFolderId: folderId }));
          setIsFolderPickerOpen(false);
        }
      }
    } catch (e) {
      console.error('Failed to select folder:', e);
    }
  };

  const handleSync = async () => {
    try {
      if (window.api?.nox) {
        setSyncStatus(prev => ({ ...prev, isSyncing: true }));
        const result = await window.api.nox.sync();
        setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: result.success ? result.lastSync : prev.lastSync }));
      }
    } catch (e) {
      console.error('Failed to sync:', e);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleRestore = async () => {
    try {
      if (!confirm('Вы уверены? Это действие заменит текущие задачи задачами из облака.')) return;
      if (window.api?.nox) {
        setSyncStatus(prev => ({ ...prev, isRestoring: true }));
        const result = await window.api.nox.restore();
        setSyncStatus(prev => ({ ...prev, isRestoring: false }));
        if (result.success && loadTasks) {
          loadTasks();
        }
      }
    } catch (e) {
      console.error('Failed to restore:', e);
      setSyncStatus(prev => ({ ...prev, isRestoring: false }));
    }
  };

  return { syncStatus, folders, isFolderPickerOpen, setIsFolderPickerOpen, handleAuth, selectFolder, handleSync, handleRestore };
}
