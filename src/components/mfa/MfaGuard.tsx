import { ReactNode } from "react";
import { useMfaGuard } from "@/hooks/useMfaGuard";
import { PageLoader } from "@/components/feedback/PageLoader";
import { MfaChallenge } from "./MfaChallenge";

interface MfaGuardProps {
    children: ReactNode;
    excludePaths?: string[];
    currentPath?: string;
}

export function MfaGuard({ children, excludePaths = [], currentPath = "" }: MfaGuardProps) {
    const { loading, needsMfa } = useMfaGuard();

    const normalizedPath = currentPath || "";
    const isExcluded = excludePaths.some((path) => normalizedPath.startsWith(path));

    if (!isExcluded && loading) {
        return <PageLoader title="Security check" description="Verifying your session and MFA status." fullscreen />;
    }

    if (!isExcluded && needsMfa) {
        return <MfaChallenge onVerified={() => window.location.reload()} onCancel={() => window.location.assign("/settings/security")} />;
    }

    return <>{children}</>;
}
