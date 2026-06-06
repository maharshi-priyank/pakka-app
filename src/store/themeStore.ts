import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDark: boolean
  setDark: (value: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: false,
      setDark: (value) => set({ isDark: value }),
    }),
    { name: 'clearwork-theme' },
  ),
)
