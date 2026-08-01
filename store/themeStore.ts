import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (val: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: true, // Dark mode default (Stitch Ember Dark Ops)
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setDarkMode: (val: boolean) => set({ isDarkMode: val }),
}));

export const getThemeColors = (isDarkMode: boolean) => ({
  background: isDarkMode ? '#131313' : '#F8F9FF',
  surface: isDarkMode ? '#1C1B1B' : '#FFFFFF',
  card: isDarkMode ? '#1C1C1C' : '#FFFFFF',
  text: isDarkMode ? '#E5E2E1' : '#0B1C30',
  subtext: isDarkMode ? 'rgba(229,226,225,0.6)' : '#565E74',
  mutedText: isDarkMode ? 'rgba(229,226,225,0.4)' : '#888888',
  border: isDarkMode ? '#353534' : '#E2E8F0',
  borderSubtle: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
  primary: '#FF6600',
  inputBg: isDarkMode ? '#131313' : '#F1F5F9',
});
