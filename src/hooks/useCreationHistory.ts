import { useState, useEffect, useCallback } from 'react';

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  createdAt: number; // Unix ms timestamp
}

const STORAGE_KEY = 'avni_creation_history';
const MAX_ITEMS = 20;

function loadFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded — trim by half and retry
    const trimmed = items.slice(0, Math.floor(items.length / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function useCreationHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(loadFromStorage);

  // Persist whenever history changes
  useEffect(() => {
    saveToStorage(history);
  }, [history]);

  const addItem = useCallback(
    (item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
      const newItem: HistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      setHistory((prev) => [newItem, ...prev].slice(0, MAX_ITEMS));
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addItem, removeItem, clearAll };
}
