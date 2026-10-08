import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'hammer_watchlist_v1';
const CHANGE_EVENT = 'hammer-watchlist-change';

export interface WatchlistEntry {
  id: string;
  workName: string;
  era?: string;
  fmvUsd?: number;
  delta24h?: number | null;
  pinnedAt: string;
}

function readStorage(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: WatchlistEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

function dispatchChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function useWatchlist() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '[]');

  const entries: WatchlistEntry[] = (() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const isWatching = useCallback(
    (id: string) => entries.some((e) => e.id === id),
    [entries],
  );

  const addToWatchlist = useCallback((entry: WatchlistEntry) => {
    const current = readStorage();
    if (current.some((e) => e.id === entry.id)) return;
    writeStorage([...current, { ...entry, pinnedAt: new Date().toISOString() }]);
    dispatchChange();
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    const current = readStorage();
    writeStorage(current.filter((e) => e.id !== id));
    dispatchChange();
  }, []);

  const toggleWatchlist = useCallback(
    (entry: WatchlistEntry) => {
      const current = readStorage();
      if (current.some((e) => e.id === entry.id)) {
        writeStorage(current.filter((e) => e.id !== entry.id));
      } else {
        writeStorage([...current, { ...entry, pinnedAt: new Date().toISOString() }]);
      }
      dispatchChange();
    },
    [],
  );

  return { entries, isWatching, addToWatchlist, removeFromWatchlist, toggleWatchlist };
}
