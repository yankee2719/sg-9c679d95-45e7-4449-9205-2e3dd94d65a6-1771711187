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
            className="relative"
            aria-label="Toggle theme"
        >
            <Sun className="h-5 w-5 text-yellow-500" style={{ display: mounted && theme === "dark" ? "block" : "none" }} />
            <Moon className="h-5 w-5 text-slate-700" style={{ display: mounted && theme === "light" ? "block" : "none" }} />
            <div className="h-5 w-5 rounded-full bg-muted" style={{ display: mounted ? "none" : "block" }} />
        </Button>
    );
}