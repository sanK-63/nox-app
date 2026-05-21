import { useState, useEffect } from 'react';

export function useTasks() {
  const [tasks, setTasks] = useState([]);

  const loadTasks = async () => {
    try {
      if (window.api?.getTasks) {
        const dbTasks = await window.api.getTasks();
        setTasks(dbTasks);
      } else {
        const saved = localStorage.getItem('tasks');
        if (saved) setTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  useEffect(() => {
    loadTasks();
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
      console.error('Failed to save task:', e);
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
      console.error('Failed to toggle task:', e);
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
      console.error('Failed to delete task:', e);
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
      console.error('Failed to add subtask:', e);
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
      console.error('Failed to toggle subtask:', e);
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
      console.error('Failed to delete subtask:', e);
    }
    return null;
  };

  return { tasks, loadTasks, saveTask, toggleTask, deleteTask, addSubtaskToTask, toggleSubtaskInTask, deleteSubtaskFromTask };
}
