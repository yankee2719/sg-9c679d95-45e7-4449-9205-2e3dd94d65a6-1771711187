import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext < ThemeContextType | undefined > (undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState < Theme > ("light");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null;

        let initialTheme: Theme;

        if (savedTheme === "dark" || savedTheme === "light") {
            initialTheme = savedTheme;
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            initialTheme = prefersDark ? "dark" : "light";
            localStorage.setItem("theme", initialTheme);
        }

        setTheme(initialTheme);

        if (initialTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);

        if (newTheme === "dark") {
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
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
