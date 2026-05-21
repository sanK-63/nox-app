import { useState, useEffect } from 'react';

export function useTasks() {
  const [tasks, setTasks] = useState([]);

  const loadTasks = async () => {
    if (window.api?.getTasks) {
      const dbTasks = await window.api.getTasks();
      setTasks(dbTasks);
    } else {
      const saved = localStorage.getItem('tasks');
      if (saved) setTasks(JSON.parse(saved));
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const saveTask = async (activeTask) => {
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
  };

  const toggleTask = async (id, currentStatus) => {
    if (window.api?.toggleTask) {
      await window.api.toggleTask({ id, is_completed: !currentStatus });
      loadTasks();
    }
  };

  const deleteTask = async (id) => {
    if (window.api?.deleteTask) {
      await window.api.deleteTask(id);
      loadTasks();
    }
  };

  const addSubtaskToTask = async (taskId, title) => {
    if (!title.trim()) return null;
    if (taskId && window.api?.addSubtask) {
      await window.api.addSubtask({ task_id: taskId, title });
      loadTasks();
      const updatedTasks = await window.api.getTasks();
      return updatedTasks.find(t => t.id === taskId);
    }
    return null;
  };

  const toggleSubtaskInTask = async (taskId, stId, currentStatus) => {
    if (window.api?.toggleSubtask) {
      await window.api.toggleSubtask({ id: stId, is_completed: !currentStatus });
      loadTasks();
      const updatedTasks = await window.api.getTasks();
      return updatedTasks.find(t => t.id === taskId);
    }
    return null;
  };

  const deleteSubtaskFromTask = async (taskId, stId) => {
    if (window.api?.deleteSubtask) {
      await window.api.deleteSubtask(stId);
      loadTasks();
      const updatedTasks = await window.api.getTasks();
      return updatedTasks.find(t => t.id === taskId);
    }
    return null;
  };

  return { tasks, loadTasks, saveTask, toggleTask, deleteTask, addSubtaskToTask, toggleSubtaskInTask, deleteSubtaskFromTask };
}
