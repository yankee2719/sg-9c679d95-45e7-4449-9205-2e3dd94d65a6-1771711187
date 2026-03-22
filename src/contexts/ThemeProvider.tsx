import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext < ThemeContextType | undefined > (undefined);

// ─── FIX HYDRATION: legge localStorage in modo sincrono nell'initializer di useState ───
// Siccome _app.tsx ha il mounted guard (return null finché !mounted),
// quando ThemeProvider viene montato siamo GIÀ sul client.
// Quindi possiamo leggere localStorage direttamente nello useState initializer
// invece di farlo in un useEffect asincrono che causa mismatch.
function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = prefersDark ? "dark" : "light";
    localStorage.setItem("theme", initial);
    return initial;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState < Theme > (getInitialTheme);

    // Applica la classe dark/light al primo mount e ad ogni cambio
    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
}
