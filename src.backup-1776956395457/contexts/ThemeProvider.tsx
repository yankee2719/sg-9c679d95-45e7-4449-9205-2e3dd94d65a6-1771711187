import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const STORAGE_KEY = "theme";
const ThemeContext = createContext < ThemeContextType | undefined > (undefined);

function resolveInitialTheme(): Theme {
    if (typeof window === "undefined") return "dark";

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    root.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState < Theme > (resolveInitialTheme);

    useEffect(() => {
        applyTheme(theme);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, theme);
        }
    }, [theme]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const onStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;
            if (event.newValue === "dark" || event.newValue === "light") {
                setThemeState(event.newValue);
            }
        };

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onMediaChange = (event: MediaQueryListEvent) => {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved === "dark" || saved === "light") return;
            setThemeState(event.matches ? "dark" : "light");
        };

        window.addEventListener("storage", onStorage);
        media.addEventListener?.("change", onMediaChange);

        return () => {
            window.removeEventListener("storage", onStorage);
            media.removeEventListener?.("change", onMediaChange);
        };
    }, []);

    const value = useMemo < ThemeContextType > (() => ({
        theme,
        setTheme: setThemeState,
        toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    }), [theme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
