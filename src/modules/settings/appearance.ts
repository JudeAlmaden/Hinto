/**
 * Theme preference, kept in memory so `useTheme` can read it synchronously.
 * The value is persisted in the settings table and hydrated at boot.
 */

import { create } from 'zustand';

export type Appearance = 'system' | 'light' | 'dark';

export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'] as const;

interface AppearanceState {
  preference: Appearance;
  setPreference: (preference: Appearance) => void;
}

export const useAppearance = create<AppearanceState>((set) => ({
  preference: 'light',
  setPreference: (preference) => set({ preference }),
}));
