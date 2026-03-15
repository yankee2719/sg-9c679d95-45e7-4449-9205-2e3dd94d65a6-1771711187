import { ReactNode, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mfaService } from "@/services/mfaService";
import { MfaChallenge } from "./MfaChallenge";

interface MfaGuardProps {
    children: ReactNode;
    excludePaths?: string[];
    currentPath?: string;
}

export function MfaGuard({ children, excludePaths = [], currentPath = "" }: MfaGuardProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaChecked, setMfaChecked] = useState(false);

    const isExcluded = excludePaths.some((path) => currentPath.startsWith(path));

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            if (authLoading) return;

            if (!isAuthenticated || isExcluded) {
                if (!mounted) return;
                setMfaRequired(false);
                setMfaChecked(true);
                return;
            }

            try {
                const needsVerification = await mfaService.needsVerification();
                if (!mounted) return;
                setMfaRequired(needsVerification);
            } catch (error) {
                console.error("MfaGuard check error:", error);
                if (!mounted) return;
                setMfaRequired(false);
            } finally {
                if (mounted) setMfaChecked(true);
            }
        };

        setMfaChecked(false);
        check();

        return () => {
            mounted = false;
        };
    }, [authLoading, currentPath, isAuthenticated, isExcluded]);

    if (authLoading || (isAuthenticated && !mfaChecked && !isExcluded)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (mfaRequired && isAuthenticated && !isExcluded) {
        return (
            <MfaChallenge
                onVerified={() => setMfaRequired(false)}
                onCancel={() => setMfaRequired(false)}
            />
        );
    }

    return <>{children}</>;
}
