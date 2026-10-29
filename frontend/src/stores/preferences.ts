import { create } from 'zustand'
import { persist } from 'zustand/middleware'
type Theme = 'light' | 'dark' | 'system'
export const usePreferences = create(
  persist<{
    theme: Theme
    collapsed: boolean
    setTheme: (theme: Theme) => void
    toggleSidebar: () => void
  }>(
    (set) => ({
      theme: 'light',
      collapsed: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'aegis-preferences' },
  ),
)
