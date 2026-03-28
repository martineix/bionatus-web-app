import { useEffect, useState } from "react";

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "app-theme"

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)

        if (saved === "light" || saved === "dark") {
            return saved
        }

        return "light"
    })

    useEffect(() => {
        const root = document.documentElement

        if (theme === "dark") {
            root.classList.add("dark")
        } else {
            root.classList.remove("dark")
        }

        localStorage.setItem(THEME_STORAGE_KEY, theme)
    }, [theme])

    function toggleTheme() {
        setTheme((prev) => (prev === "light" ? "dark" : "light"))
    }

    return {
        theme,
        setTheme,
        toggleTheme
    }
}