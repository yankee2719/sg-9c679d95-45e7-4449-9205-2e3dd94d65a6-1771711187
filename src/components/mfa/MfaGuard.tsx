import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Loader2,
    LogOut,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mfaService } from "@/services/mfaService";
import { MfaChallenge } from "./MfaChallenge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MfaGuardProps {
    children: ReactNode;
    excludePaths?: string[];
    currentPath?: string;
}

type GuardState =
    | { status: "idle" | "loading" }
    | { status: "allow" }
    | { status: "needs-enrollment" }
    | { status: "needs-verification" }
    | { status: "error"; message: string };

export function MfaGuard({
    children,
    excludePaths = [],
    currentPath = "",
}: MfaGuardProps) {
    const {
        isAuthenticated,
        loading: authLoading,
        shouldEnforceMfa,
    } = useAuth();

    const [guardState, setGuardState] = useState < GuardState > ({ status: "idle" });
    const [retryKey, setRetryKey] = useState(0);

    const isExcluded = useMemo(
        () => excludePaths.some((path) => currentPath.startsWith(path)),
        [excludePaths, currentPath]
    );

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            if (authLoading) return;

            if (!isAuthenticated || isExcluded || !shouldEnforceMfa) {
                if (!mounted) return;
                setGuardState({ status: "allow" });
                return;
            }

            try {
                if (!mounted) return;
                setGuardState({ status: "loading" });

                const status = await mfaService.getStatus();

                if (!mounted) return;

                if (!status.hasMfaEnabled) {
                    setGuardState({ status: "needs-enrollment" });
                    return;
                }

                if (status.needsMfaVerification) {
                    setGuardState({ status: "needs-verification" });
                    return;
                }

                setGuardState({ status: "allow" });
            } catch (error) {
                console.error("MfaGuard check error:", error);

                if (!mounted) return;

                setGuardState({
                    status: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Impossibile verificare lo stato MFA.",
                });
            }
        };

        setGuardState({ status: "idle" });
        void check();

        return () => {
            mounted = false;
        };
    }, [
        authLoading,
        isAuthenticated,
        isExcluded,
        shouldEnforceMfa,
        currentPath,
        retryKey,
    ]);

    const handleSignOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const handleRetry = useCallback(() => {
        setRetryKey((prev) => prev + 1);
    }, []);

    if (
        authLoading ||
        (isAuthenticated &&
            !isExcluded &&
            shouldEnforceMfa &&
            (guardState.status === "idle" || guardState.status === "loading"))
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (guardState.status === "needs-enrollment") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-primary/10 p-4">
                                <ShieldAlert className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle>Autenticazione a due fattori richiesta</CardTitle>
                        <CardDescription>
                            Il tuo account richiede la 2FA, ma non risulta ancora configurato
                            alcun autenticatore verificato.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                            Per continuare devi aprire la pagina sicurezza e configurare
                            un'app TOTP come Google Authenticator, Authy o 1Password.
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button asChild className="w-full">
                                <Link href="/settings/security">
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    Vai a Sicurezza account
                                </Link>
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleSignOut}
                                className="w-full"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Esci
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (
        guardState.status === "needs-verification" &&
        isAuthenticated &&
        !isExcluded &&
        shouldEnforceMfa
    ) {
        return (
            <MfaChallenge
                onVerified={() => setGuardState({ status: "allow" })}
            />
        );
    }

    if (guardState.status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-destructive/10 p-4">
                                <ShieldAlert className="h-8 w-8 text-destructive" />
                            </div>
                        </div>
                        <CardTitle>Verifica MFA non disponibile</CardTitle>
                        <CardDescription>
                            Non è stato possibile verificare lo stato della 2FA.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                            {guardState.message}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button onClick={handleRetry} className="w-full">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Riprova
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleSignOut}
                                className="w-full"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Esci
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}