import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-lg text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10">
                    <SearchX className="h-10 w-10 text-orange-500" />
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-widest text-orange-500">
                        404
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Page not found
                    </h1>
                    <p className="text-base text-muted-foreground">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button asChild>
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>

                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go back
                    </Button>
                </div>
            </div>

            <div className="mt-16 text-xs text-muted-foreground/60">
                MACHINA &mdash; Industrial Maintenance Platform
            </div>
        </div>
    );
}
