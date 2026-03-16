import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { mfaService, type AuthenticatorLevel } from "@/services/mfaService";

type CachedMfaState = {
    userId: string | null;
    aal: AuthenticatorLevel;
    hasAuthenticator: boolean;
    fetchedAt: number;
};

const CACHE_TTL_MS = 15000;
let cachedState: CachedMfaState | null = null;
let pendingRequest: Promise<CachedMfaState> | null = null;

async function readMfaState(userId: string): Promise<CachedMfaState> {
    const now = Date.now();

    if (cachedState && cachedState.userId === userId && now - cachedState.fetchedAt < CACHE_TTL_MS) {
        return cachedState;
    }

    if (pendingRequest) {
        return pendingRequest;
    }

    pendingRequest = mfaService
        .getStatus()
        .then((status) => {
            cachedState = {
                userId,
                aal: status.currentLevel,
                hasAuthenticator: status.hasMfaEnabled,
                fetchedAt: Date.now(),
            };
            return cachedState;
        })
        .finally(() => {
            pendingRequest = null;
        });

    return pendingRequest;
}

export function invalidateMfaGuardCache() {
    cachedState = null;
    pendingRequest = null;
}

export function useMfaGuard() {
    const { loading: authLoading, membership, isPlatformAdmin, isAuthenticated, shouldEnforceMfa, user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [aal, setAal] = useState < AuthenticatorLevel > (null);
    const [hasAuthenticator, setHasAuthenticator] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (authLoading) return;

            if (!isAuthenticated || !user?.id) {
                if (!mounted) return;
                setAal(null);
                setHasAuthenticator(false);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const status = await readMfaState(user.id);
                if (!mounted) return;
                setAal(status.aal);
                setHasAuthenticator(status.hasAuthenticator);
            } catch (error) {
                console.error("useMfaGuard error:", error);
                if (!mounted) return;
                setAal("aal1");
                setHasAuthenticator(false);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, [authLoading, isAuthenticated, user?.id]);

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
