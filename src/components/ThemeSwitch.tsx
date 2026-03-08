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

    const label = mounted && theme === "dark" ? "Attiva modalità chiara" : "Attiva modalità scura";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={mounted ? toggleTheme : undefined}
            className="relative rounded-xl border border-border bg-card text-foreground hover:bg-muted"
            aria-label={label}
            title={label}
        >
            {mounted ? (
                theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
            ) : (
                <div className="h-5 w-5 rounded-full bg-muted" />
            )}
        </Button>
    );
}
