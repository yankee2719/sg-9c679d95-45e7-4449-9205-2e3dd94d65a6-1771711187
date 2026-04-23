import { Loader2 } from "lucide-react";

interface PageLoaderProps {
    title?: string;
    description?: string;
    fullscreen?: boolean;
    compact?: boolean;
}

export function PageLoader({
    title = "Loading",
    description,
    fullscreen = false,
    compact = false,
}: PageLoaderProps) {
    return (
        <div
            className={[
                "flex w-full items-center justify-center px-4",
                fullscreen ? "min-h-screen" : compact ? "min-h-[220px]" : "min-h-[60vh]",
            ].join(" ")}
        >
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
            </div>
        </div>
    );
}

export default PageLoader;
