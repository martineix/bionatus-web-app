import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

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

function withoutTransitions(callback: () => void) {
  const root = document.documentElement
  root.classList.add("theme-switching")

  callback()

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove("theme-switching")
    })
  })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(nextTheme: Theme) {
    withoutTransitions(() => {
      applyTheme(nextTheme)
      setThemeState(nextTheme)
    })
  }

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light"

    withoutTransitions(() => {
      applyTheme(nextTheme)
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