import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";

type AAL = "aal1" | "aal2" | null;

export function useMfaGuard() {
    const [loading, setLoading] = useState(true);
    const [aal, setAal] = useState < AAL > (null);
    const [userRole, setUserRole] = useState < string | null > (null);
    const [hasAuthenticator, setHasAuthenticator] = useState < boolean > (false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const [
                    authUserRes,
                    assuranceRes,
                    factorsRes,
                ] = await Promise.all([
                    supabase.auth.getUser(),
                    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
                    supabase.auth.mfa.listFactors(),
                ]);

                const user = authUserRes.data.user ?? null;
                const currentAal = (assuranceRes.data?.currentLevel as AAL) ?? "aal1";

                let role: string | null = null;
                if (user) {
                    const profile = await getProfileData(user.id);
                    role = profile?.role ?? null;
                }

                const authenticatorFactors =
                    factorsRes.data?.all?.filter((f) => f.factor_type === "totp") ?? [];

                if (!mounted) return;

                setAal(currentAal);
                setUserRole(role);
                setHasAuthenticator(authenticatorFactors.length > 0);
            } catch (error) {
                console.error("useMfaGuard error:", error);
                if (!mounted) return;
                setAal("aal1");
                setUserRole(null);
                setHasAuthenticator(false);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async () => {
            load();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const isPrivilegedRole = useMemo(() => {
        return userRole === "admin" || userRole === "supervisor";
    }, [userRole]);

    const isAal2 = aal === "aal2";

    // Admin/supervisor devono avere MFA obbligatoria
    const mustEnforceMfa = isPrivilegedRole;

    // Serve MFA ma non è ancora soddisfatta
    const needsMfa = mustEnforceMfa && !isAal2;

    return {
        loading,
        aal,
        isAal2,
        userRole,
        isPrivilegedRole,
        hasAuthenticator,
        mustEnforceMfa,
        needsMfa,
    };
}