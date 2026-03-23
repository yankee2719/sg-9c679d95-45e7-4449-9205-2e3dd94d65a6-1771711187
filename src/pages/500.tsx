import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default function InternalServerErrorPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="w-full max-w-lg text-center space-y-6">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-widest text-red-500">
                        500
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Internal Server Error
                    </h1>
                    <p className="text-base text-muted-foreground">
                        Something went wrong on our end. Please try again or return to the dashboard.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Button onClick={() => window.location.reload()}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reload page
                    </Button>

                    <Button variant="outline" asChild>
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mt-16 text-xs text-muted-foreground/60">
                MACHINA &mdash; Industrial Maintenance Platform
            </div>
        </div>
    );
}
