import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    const { mounted, loading: authLoading, user, shouldEnforceMfa } = useAuth();

    const [checking, setChecking] = useState(false);
    const [verified, setVerified] = useState(false);

    const redirectingRef = useRef(false);

    const shouldBypass = useMemo(() => {
        return MFA_BYPASS_ROUTES.some((route) => router.pathname.startsWith(route));
    }, [router.pathname]);

    useEffect(() => {
        let active = true;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const run = async () => {
            if (!mounted) return;
            if (authLoading) return;

            if (!user) {
                if (active) {
                    setVerified(true);
                    setChecking(false);
                }
                return;
            }

            if (!shouldEnforceMfa || shouldBypass) {
                if (active) {
                    setVerified(true);
                    setChecking(false);
                }
                return;
            }

            setChecking(true);

timeoutId = setTimeout(() => {
    if (!active) return;
    console.warn("MfaGuard timeout — redirecting to security");
    setChecking(false);
    setVerified(false); // NON true
    if (!redirectingRef.current) {
        redirectingRef.current = true;
        void router.replace("/settings/security");
    }
}, 8000);

            try {
                const { data, error } =
                    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (error) throw error;

                const isAal2 = data?.currentLevel === "aal2";

                if (!active) return;

                setVerified(isAal2);
                setChecking(false);

                if (!isAal2 && !redirectingRef.current) {
                    redirectingRef.current = true;
                    void router.replace("/settings/security");
                }
            } catch (error) {
                console.error("MfaGuard error:", error);

                if (!active) return;

                setVerified(true);
                setChecking(false);
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        };

        void run();

        return () => {
            active = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [mounted, authLoading, user?.id, shouldEnforceMfa, shouldBypass, router]);

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

    if (!verified && !shouldBypass) {
        return null;
    }

    return <>{children}</>;
}