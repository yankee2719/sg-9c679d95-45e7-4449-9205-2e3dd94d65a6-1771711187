import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext < ThemeContextType | undefined > (undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Default "light" is fine — the inline script in _document.tsx
    // has already applied the correct class to <html> before React loads.
    // So there's no flash and no hydration mismatch.
    const [theme, setTheme] = useState < Theme > ("light");

    useEffect(() => {
        const saved = localStorage.getItem("theme") as Theme | null;
        const initial: Theme =
            saved === "dark" || saved === "light"
                ? saved
                : window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
        setTheme(initial);
    }, []);

    const toggleTheme = () => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("theme", next);
        if (next === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
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
