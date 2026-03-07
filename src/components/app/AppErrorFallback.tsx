// src/components/app/AppErrorFallback.tsx
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorFallbackProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export default function AppErrorFallback({
    title = "Si è verificato un errore",
    message = "La pagina non è stata caricata correttamente. Riprova oppure torna alla dashboard.",
    onRetry,
}: AppErrorFallbackProps) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    {onRetry && (
                        <Button onClick={onRetry}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Riprova
                        </Button>
                    )}

                    <Button variant="outline" asChild>
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
