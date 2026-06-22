'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button type="button" onClick={toggle} aria-label="Toggle theme"
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev transition-colors">
      {theme === 'dark'
        ? <Sun className="h-4 w-4 text-text-soft" strokeWidth={1.6} />
        : <Moon className="h-4 w-4 text-text-soft" strokeWidth={1.6} />}
    </button>
  )
}
