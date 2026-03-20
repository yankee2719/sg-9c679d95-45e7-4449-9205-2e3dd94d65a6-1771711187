import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MFA_BYPASS_ROUTES = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/settings/security",
    "/mfa/setup",
];

export function MfaGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { loading, user, shouldEnforceMfa } = useAuth();

    const [checking, setChecking] = useState(false);
    const [verified, setVerified] = useState(false);
    const redirectingRef = useRef(false);

    const shouldBypass = useMemo(() => {
        return MFA_BYPASS_ROUTES.some((route) => router.pathname.startsWith(route));
    }, [router.pathname]);

    useEffect(() => {
        let active = true;

        const checkMfa = async () => {
            if (loading) return;
            if (!user) {
                if (active) setVerified(true);
                return;
            }
            if (!shouldEnforceMfa || shouldBypass) {
                if (active) setVerified(true);
                return;
            }

            setChecking(true);

            try {
                const { data, error } =
                    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (error) throw error;

                const isAal2 = data?.currentLevel === "aal2";

                if (active) {
                    setVerified(isAal2);
                }

                if (!isAal2 && !redirectingRef.current) {
                    redirectingRef.current = true;
                    void router.replace("/settings/security");
                }
            } catch (error) {
                console.error("MfaGuard error:", error);
                if (active) {
                    setVerified(true);
                }
            } finally {
                if (active) {
                    setChecking(false);
                }
            }
        };

        void checkMfa();

        return () => {
            active = false;
        };
    }, [loading, user?.id, shouldEnforceMfa, shouldBypass, router]);

    if (loading || checking) {
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