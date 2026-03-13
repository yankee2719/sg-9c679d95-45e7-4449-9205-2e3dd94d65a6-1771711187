import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMfaStatus } from "@/services/mfaService";

export function useMfaGuard() {
    const [loading, setLoading] = useState(true);
    const [aal, setAal] = useState < string | null > (null);
    const [nextLevel, setNextLevel] = useState < string | null > (null);

    useEffect(() => {
        const load = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setAal(null);
                    setNextLevel(null);
                    return;
                }

                const status = await getMfaStatus();
                setAal(status.currentLevel ?? null);
                setNextLevel(status.nextLevel ?? null);
            } catch (error) {
                console.error("MFA guard load error:", error);
            } finally {
                setLoading(false);
            }
        };

        load();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async () => {
            try {
                const status = await getMfaStatus();
                setAal(status.currentLevel ?? null);
                setNextLevel(status.nextLevel ?? null);
            } catch (error) {
                console.error("MFA guard auth change error:", error);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const isAal2 = useMemo(() => aal === "aal2", [aal]);
    const needsMfa = useMemo(() => aal !== "aal2" && nextLevel === "aal2", [aal, nextLevel]);

    return {
        loading,
        aal,
        nextLevel,
        isAal2,
        needsMfa,
    };
}