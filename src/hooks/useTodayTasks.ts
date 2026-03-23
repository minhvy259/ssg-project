import { useState, useEffect, useCallback } from "react";

export interface TodayTask {
  id: string;
  text: string;
  done: boolean;
}

const STORAGE_PREFIX = "studyverse_tasks";

function getStorageKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${STORAGE_PREFIX}_${userId}_${today}`;
}

function loadTasks(userId: string): TodayTask[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks(userId: string, tasks: TodayTask[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

export function useTodayTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<TodayTask[]>(() =>
    userId ? loadTasks(userId) : []
  );

  useEffect(() => {
    if (userId) {
      setTasks(loadTasks(userId));
    } else {
      setTasks([]);
    }
  }, [userId]);

  const persist = useCallback(
    (next: TodayTask[]) => {
      setTasks(next);
      if (userId) saveTasks(userId, next);
    },
    [userId]
  );

  const addTask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const newTask: TodayTask = {
        id: crypto.randomUUID(),
        text: trimmed,
        done: false,
      };
      persist([...tasks, newTask]);
    },
    [tasks, persist]
  );

  const toggleTask = useCallback(
    (id: string) => {
      persist(
        tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      );
    },
    [tasks, persist]
  );

  const removeTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist]
  );

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    tasks,
    addTask,
    toggleTask,
    removeTask,
    completedCount,
    totalCount,
    progressPercent,
  };
}
