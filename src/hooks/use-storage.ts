import { useSyncExternalStore } from 'react';

import { getStorageSnapshot, subscribeToStorage } from '@/db/client';

/** D6 storage status for the blocking card and the diagnostics screen. */
export function useStorage() {
  return useSyncExternalStore(subscribeToStorage, getStorageSnapshot, getStorageSnapshot);
}
