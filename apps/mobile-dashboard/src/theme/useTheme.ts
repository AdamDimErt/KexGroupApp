import { create } from 'zustand';
import { darkColors, lightColors, type ThemeColors } from './colors';

type ThemeMode = 'dark' | 'light';

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  colors: darkColors,
  isDark: true,
  toggle: () =>
    set((s) => {
      const next = s.mode === 'dark' ? 'light' : 'dark';
      return {
        mode: next,
        colors: next === 'dark' ? darkColors : lightColors,
        isDark: next === 'dark',
      };
    }),
  setMode: (mode) =>
    set({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      isDark: mode === 'dark',
    }),
}));

/** Shorthand hook — returns current theme colors */
export function useColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}
