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
            variant="outline"
            size="icon"
            onClick={mounted ? toggleTheme : undefined}
            className="h-10 w-10 rounded-xl border-border bg-card text-foreground hover:bg-muted"
            aria-label="Cambia tema"
            title={mounted ? (theme === "dark" ? "Passa a modalità chiara" : "Passa a modalità scura") : "Tema"}
        >
            {!mounted ? (
                <div className="h-4 w-4 rounded-full bg-muted" />
            ) : theme === "dark" ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
        </Button>
    );
}
