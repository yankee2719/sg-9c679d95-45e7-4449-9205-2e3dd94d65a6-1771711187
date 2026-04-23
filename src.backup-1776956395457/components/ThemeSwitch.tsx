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
            variant="ghost"
            size="icon"
            onClick={mounted ? toggleTheme : undefined}
            className="rounded-2xl border border-border bg-card text-foreground shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)] hover:bg-muted"
            aria-label="Cambia tema"
        >
            {!mounted ? (
                <div className="h-5 w-5 rounded-full bg-muted" />
            ) : theme === "dark" ? (
                <Sun className="h-5 w-5 text-amber-500" />
            ) : (
                <Moon className="h-5 w-5 text-slate-700" />
            )}
        </Button>
    );
}
