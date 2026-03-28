import { useLayoutEffect, useState } from "react"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "app-theme"

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"

  const saved = localStorage.getItem(THEME_STORAGE_KEY)

  if (saved === "light" || saved === "dark") {
    return saved
  }

  return "light"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    const root = document.documentElement

    root.classList.remove("light", "dark")
    root.classList.add(theme)

    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}