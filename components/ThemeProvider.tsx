'use client'
import { createContext, useContext, useEffect, useState } from 'react'
type Theme = 'light' | 'dark'
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }
const ThemeContext = createContext<Ctx | null>(null)
const KEY = 'portal_theme'
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY) as Theme | null : null
    const initial: Theme = stored === 'dark' || stored === 'light' ? stored : 'dark'
    setThemeState(initial); document.documentElement.setAttribute('data-theme', initial)
  }, [])
  const setTheme = (t: Theme) => { setThemeState(t); document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(KEY, t) } catch {} }
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')
  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}
export function useTheme() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error('useTheme outside provider'); return ctx }
