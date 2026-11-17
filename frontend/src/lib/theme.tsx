import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; toggleTheme: () => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('marketday.theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('marketday.theme', theme)
  }, [theme])
  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function ThemeToggle() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeToggle must be used inside ThemeProvider')
  const isDark = context.theme === 'dark'
  const Icon = isDark ? Sun : Moon
  return <button className="theme-toggle" type="button" onClick={context.toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} aria-pressed={isDark} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}><Icon size={17} aria-hidden="true" /><span>{isDark ? 'Light' : 'Dark'}</span></button>
}
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
