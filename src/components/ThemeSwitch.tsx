import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeSwitch() {
    const [mounted, setMounted] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={mounted ? toggleTheme : undefined}
            className="relative border border-border bg-background/80 hover:bg-muted"
            aria-label="Toggle theme"
        >
            {!mounted ? (
                <div className="h-5 w-5 rounded-full bg-muted" />
            ) : theme === "dark" ? (
                <Sun className="h-5 w-5 text-amber-500" />
            ) : (
                <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            )}
        </Button>
    );
}
