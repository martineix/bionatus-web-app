import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { flushSync } from "react-dom"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = "app-theme"

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === "light" || saved === "dark") return saved

  return "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(nextTheme: Theme) {
    applyTheme(nextTheme)
    flushSync(() => {
      setThemeState(nextTheme)
    })
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light"
    applyTheme(nextTheme)
    flushSync(() => {
      setThemeState(nextTheme)
    })
  }

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}