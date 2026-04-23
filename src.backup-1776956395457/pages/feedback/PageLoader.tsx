import { Loader2 } from "lucide-react";

interface PageLoaderProps {
    title?: string;
    description?: string;
}

export function PageLoader({
    title = "Caricamento",
    description = "Stiamo preparando i dati della pagina.",
}: PageLoaderProps) {
    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="rounded-2xl border border-border bg-card p-10 shadow-sm">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PageLoader;