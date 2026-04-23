import { ReactNode, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mfaService } from "@/services/mfaService";
import { MfaChallenge } from "./MfaChallenge";

interface MfaGuardProps {
    children: ReactNode;
    excludePaths?: string[];
    currentPath?: string;
}

type GuardState =
    | { status: "idle" | "loading" }
    | { status: "allow" }
    | { status: "needs-verification" };

export function MfaGuard({ children, excludePaths = [], currentPath = "" }: MfaGuardProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [guardState, setGuardState] = useState < GuardState > ({ status: "idle" });

    const isExcluded = useMemo(
        () => excludePaths.some((path) => currentPath.startsWith(path)),
        [excludePaths, currentPath]
    );

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            if (authLoading) return;

            if (!isAuthenticated || isExcluded) {
                if (mounted) setGuardState({ status: "allow" });
                return;
            }

            try {
                setGuardState({ status: "loading" });
                const status = await mfaService.getStatus();
                if (!mounted) return;

                if (status.hasMfaEnabled && status.needsMfaVerification) {
                    setGuardState({ status: "needs-verification" });
                    return;
                }

                setGuardState({ status: "allow" });
            } catch (error) {
                console.error("MfaGuard check error:", error);
                if (mounted) setGuardState({ status: "allow" });
            }
        };

        setGuardState({ status: "idle" });
        void check();

        return () => {
            mounted = false;
        };
    }, [authLoading, isAuthenticated, isExcluded, currentPath]);

    if (authLoading || (isAuthenticated && !isExcluded && (guardState.status === "idle" || guardState.status === "loading"))) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (guardState.status === "needs-verification" && isAuthenticated && !isExcluded) {
        return (
            <MfaChallenge
                onVerified={() => setGuardState({ status: "allow" })}
                onCancel={() => setGuardState({ status: "allow" })}
            />
        );
    }

    return <>{children}</>;
}
