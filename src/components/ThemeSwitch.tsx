import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeSwitch() {
    const [mounted, setMounted] = useState(false);

    // ✅ useTheme viene SEMPRE chiamato, non condizionalmente
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Placeholder durante SSR (prima del mount)
    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Toggle theme"
                disabled
            >
                <div className="h-5 w-5 rounded-full bg-muted" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative"
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
                <Moon className="h-5 w-5 text-slate-700" />
            )}
        </Button>
    );
}