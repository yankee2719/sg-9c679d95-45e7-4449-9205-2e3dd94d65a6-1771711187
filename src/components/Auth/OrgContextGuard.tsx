import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";

interface OrgContextGuardProps {
    children: ReactNode;
}

export default function OrgContextGuard({ children }: OrgContextGuardProps) {
    const router = useRouter();
    const { loading, isAuthenticated, organization } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            void router.replace("/login");
            return;
        }

        if (!organization?.id || !organization?.type) {
            void router.replace("/settings/organization");
        }
    }, [loading, isAuthenticated, organization?.id, organization?.type, router]);

    if (loading) return null;
    if (!isAuthenticated) return null;
    if (!organization?.id || !organization?.type) return null;

    return <>{children}</>;
}