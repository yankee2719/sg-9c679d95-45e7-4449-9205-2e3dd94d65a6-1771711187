import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MfaChallenge } from "@/components/mfa/MfaChallenge";

const MFA_BYPASS_ROUTES = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/offline",
    "/settings/security",
];

export function MfaGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { mounted, loading: authLoading, user, shouldEnforceMfa, refreshUserContext } = useAuth();

    const [checking, setChecking] = useState(false);
    const [verified, setVerified] = useState(false);
    // ─── FIX: nuovo stato per mostrare il challenge invece di fare redirect ───
    const [showChallenge, setShowChallenge] = useState(false);

    const shouldBypass = useMemo(() => {
        return MFA_BYPASS_ROUTES.some((route) => router.pathname.startsWith(route));
    }, [router.pathname]);

    useEffect(() => {
        let active = true;

        const run = async () => {
            if (!mounted) return;
            if (authLoading) return;

            // Nessun utente loggato → lascia passare (vedrà login)
            if (!user) {
                if (active) {
                    setVerified(true);
                    setChecking(false);
                    setShowChallenge(false);
                }
                return;
            }

            // MFA non richiesto per questo ruolo, o siamo su una route bypass
            if (!shouldEnforceMfa || shouldBypass) {
                if (active) {
                    setVerified(true);
                    setChecking(false);
                    setShowChallenge(false);
                }
                return;
            }

            setChecking(true);

            try {
                const { data, error } =
                    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (error) throw error;

                const isAal2 = data?.currentLevel === "aal2";

                if (!active) return;

                if (isAal2) {
                    // Utente ha completato la verifica MFA
                    setVerified(true);
                    setChecking(false);
                    setShowChallenge(false);
                } else {
                    // ─── FIX: mostra il challenge inline invece di fare redirect ───
                    // Prima faceva router.replace("/settings/security") che creava un loop
                    setVerified(false);
                    setChecking(false);
                    setShowChallenge(true);
                }
            } catch (error) {
                console.error("MfaGuard error:", error);

                if (!active) return;

                // In caso di errore, lascia passare per non bloccare l'utente
                setVerified(true);
                setChecking(false);
                setShowChallenge(false);
            }
        };

        void run();

        return () => {
            active = false;
        };
    }, [mounted, authLoading, user?.id, shouldEnforceMfa, shouldBypass]);

    // ─── FIX: quando l'utente completa il challenge TOTP ───
    const handleMfaVerified = async () => {
        setShowChallenge(false);
        setVerified(true);
        // Aggiorna il contesto auth per riflettere aal2
        await refreshUserContext();
    };

    const handleMfaCancel = () => {
        // L'utente vuole uscire → logout e torna al login
        setShowChallenge(false);
        setVerified(false);
        void router.replace("/login");
    };

    if (!mounted) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Caricamento...
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Verifica sessione...
            </div>
        );
    }

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                Verifica sicurezza...
            </div>
        );
    }

    // ─── FIX: mostra il challenge TOTP inline ───
    if (showChallenge) {
        return (
            <MfaChallenge
                onVerified={handleMfaVerified}
                onCancel={handleMfaCancel}
            />
        );
    }

    if (!verified && !shouldBypass) {
        return null;
    }

    return <>{children}</>;
}
