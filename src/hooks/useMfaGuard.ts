import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mfaService, type AuthenticatorLevel } from "@/services/mfaService";

export function useMfaGuard() {
    const {
        loading: authLoading,
        membership,
        isPlatformAdmin,
        isAuthenticated,
        shouldEnforceMfa,
    } = useAuth();

    const [loading, setLoading] = useState(true);
    const [aal, setAal] = useState < AuthenticatorLevel > (null);
    const [hasAuthenticator, setHasAuthenticator] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (authLoading) return;

            if (!isAuthenticated) {
                if (!mounted) return;
                setAal(null);
                setHasAuthenticator(false);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const status = await mfaService.getStatus();
                if (!mounted) return;
                setAal(status.currentLevel);
                setHasAuthenticator(status.hasMfaEnabled);
            } catch (error) {
                console.error("useMfaGuard error:", error);
                if (!mounted) return;
                setAal("aal1");
                setHasAuthenticator(false);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [authLoading, isAuthenticated]);

    const userRole = (membership?.role as string | null) ?? null;
    const isAal2 = aal === "aal2";
    const mustEnforceMfa = shouldEnforceMfa;
    const needsEnrollment = mustEnforceMfa && !hasAuthenticator;
    const needsMfa = mustEnforceMfa && !isAal2;

    return {
        loading: authLoading || loading,
        aal,
        isAal2,
        userRole,
        isPrivilegedRole: mustEnforceMfa || isPlatformAdmin,
        hasAuthenticator,
        mustEnforceMfa,
        needsEnrollment,
        needsMfa,
    };
}
