import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      if (window.api?.getTasks) {
        const dbTasks = await window.api.getTasks();
        setTasks(dbTasks);
      } else {
        const saved = localStorage.getItem('tasks');
        if (saved) setTasks(JSON.parse(saved));
      }
    } catch (e) {
      showToast('Ошибка загрузки задач');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      if (window.api?.getTags) {
        const dbTags = await window.api.getTags();
        setTags(dbTags);
      }
    } catch (e) {
      showToast('Ошибка загрузки тегов');
    }
  };

  useEffect(() => {
    loadTasks();
    loadTags();
  }, []);

  const saveTask = async (activeTask) => {
    try {
      if (!activeTask.title.trim()) return;
      if (window.api?.addTask) {
        await window.api.addTask(activeTask);
        loadTasks();
      } else {
        const newTask = { ...activeTask, id: activeTask.id || Date.now(), is_completed: 0 };
        const updated = activeTask.id ? tasks.map(t => t.id === activeTask.id ? activeTask : t) : [newTask, ...tasks];
        setTasks(updated);
        localStorage.setItem('tasks', JSON.stringify(updated));
      }
    } catch (e) {
      showToast('Ошибка сохранения задачи');
    }
  };

  const toggleTask = async (id, currentStatus) => {
    try {
      if (window.api?.toggleTask) {
        await window.api.toggleTask({ id, is_completed: !currentStatus });
        loadTasks();
      } else {
        const updated = tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t);
        setTasks(updated);
        localStorage.setItem('tasks', JSON.stringify(updated));
      }
    } catch (e) {
      showToast('Ошибка обновления задачи');
    }
  };

  const deleteTask = async (id) => {
    try {
      if (window.api?.deleteTask) {
        await window.api.deleteTask(id);
        loadTasks();
      } else {
        const updated = tasks.filter(t => t.id !== id);
        setTasks(updated);
        localStorage.setItem('tasks', JSON.stringify(updated));
      }
    } catch (e) {
      showToast('Ошибка удаления задачи');
    }
  };

  const addSubtaskToTask = async (taskId, title) => {
    try {
      if (!title.trim()) return null;
      if (taskId && window.api?.addSubtask) {
        await window.api.addSubtask({ task_id: taskId, title });
        loadTasks();
        const updatedTasks = await window.api.getTasks();
        return updatedTasks.find(t => t.id === taskId);
      }
    } catch (e) {
      showToast('Ошибка добавления подзадачи');
    }
    return null;
  };

  const toggleSubtaskInTask = async (taskId, stId, currentStatus) => {
    try {
      if (window.api?.toggleSubtask) {
        await window.api.toggleSubtask({ id: stId, is_completed: !currentStatus });
        loadTasks();
        const updatedTasks = await window.api.getTasks();
        return updatedTasks.find(t => t.id === taskId);
      }
    } catch (e) {
      showToast('Ошибка обновления подзадачи');
    }
    return null;
  };

  const deleteSubtaskFromTask = async (taskId, stId) => {
    try {
      if (window.api?.deleteSubtask) {
        await window.api.deleteSubtask(stId);
        loadTasks();
        const updatedTasks = await window.api.getTasks();
        return updatedTasks.find(t => t.id === taskId);
      }
    } catch (e) {
      showToast('Ошибка удаления подзадачи');
    }
    return null;
  };

  const addTag = async (name, color) => {
    try {
      if (window.api?.addTag) {
        const result = await window.api.addTag({ name, color });
        if (!result.error) {
          loadTags();
          return result;
        }
      }
    } catch (e) {
      showToast('Ошибка создания тега');
    }
    return null;
  };

  const deleteTag = async (id) => {
    try {
      if (window.api?.deleteTag) {
        await window.api.deleteTag(id);
        loadTags();
        loadTasks();
      }
    } catch (e) {
      showToast('Ошибка удаления тега');
    }
  };

  const addTaskTag = async (taskId, tagId) => {
    try {
      if (window.api?.addTaskTag) {
        await window.api.addTaskTag({ task_id: taskId, tag_id: tagId });
        loadTasks();
      }
    } catch (e) {
      showToast('Ошибка добавления тега');
    }
  };

  const removeTaskTag = async (taskId, tagId) => {
    try {
      if (window.api?.removeTaskTag) {
        await window.api.removeTaskTag({ task_id: taskId, tag_id: tagId });
        loadTasks();
      }
    } catch (e) {
      showToast('Ошибка удаления тега с задачи');
    }
  };

  return { tasks, tags, isLoading, loadTasks, loadTags, saveTask, toggleTask, deleteTask, addSubtaskToTask, toggleSubtaskInTask, deleteSubtaskFromTask, addTag, deleteTag, addTaskTag, removeTaskTag };
}
