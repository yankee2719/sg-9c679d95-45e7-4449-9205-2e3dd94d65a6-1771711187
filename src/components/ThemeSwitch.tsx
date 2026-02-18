import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeSwitch() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Non chiamare useTheme durante SSR - ritorna placeholder
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

    const { theme, toggleTheme } = useTheme();

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