// src/pages/404.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                        <SearchX className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Il percorso richiesto non esiste oppure è stato spostato durante il refactor della webapp.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                    <Button asChild>
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>

                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Indietro
                    </Button>
                </div>
            </div>
        </div>
    );
}
