// src/hooks/usePlatformAuth.tsx
/**
 * Platform Authentication Hook
 * Manages platform user authentication and access control
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { platformService } from "@/services/platformService";
import { useToast } from "@/hooks/use-toast";

export interface PlatformAuthState {
    isPlatform: boolean;
    platformRole: string | null;
    platformUser: any | null;
    loading: boolean;
    isImpersonating: boolean;
    impersonationDetails: {
        sessionId?: string;
        organizationId?: string;
        expiresAt?: string;
    } | null;
}

export function usePlatformAuth() {
    const router = useRouter();
    const { toast } = useToast();

    const [state, setState] = useState < PlatformAuthState > ({
        isPlatform: false,
        platformRole: null,
        platformUser: null,
        loading: true,
        isImpersonating: false,
        impersonationDetails: null,
    });

    useEffect(() => {
        checkPlatformAccess();
    }, []);

    const checkPlatformAccess = async () => {
        try {
            setState((prev) => ({ ...prev, loading: true }));

            const [isPlatform, role, user, impersonation] = await Promise.all([
                platformService.isPlatformUser(),
                platformService.getPlatformRole(),
                platformService.getCurrentPlatformUser(),
                platformService.isImpersonating(),
            ]);

            setState({
                isPlatform,
                platformRole: role,
                platformUser: user,
                loading: false,
                isImpersonating: impersonation.active,
                impersonationDetails: impersonation.active ? impersonation : null,
            });
        } catch (error) {
            console.error("Error checking platform access:", error);
            setState((prev) => ({ ...prev, loading: false }));
        }
    };

    const requirePlatformAccess = (
        requiredRole?: "platform_owner" | "platform_admin" | "platform_support"
    ) => {
        if (!state.isPlatform) {
            toast({
                title: "Access Denied",
                description: "Platform administrator access required",
                variant: "destructive",
            });
            router.push("/dashboard");
            return false;
        }

        if (requiredRole && state.platformRole !== requiredRole) {
            toast({
                title: "Insufficient Permissions",
                description: `${requiredRole} role required for this action`,
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    const canImpersonate = () => {
        return (
            state.isPlatform &&
            state.platformUser?.can_impersonate === true
        );
    };

    const canModifyTenants = () => {
        return (
            state.isPlatform &&
            state.platformUser?.can_modify_tenants === true
        );
    };

    return {
        ...state,
        checkPlatformAccess,
        requirePlatformAccess,
        canImpersonate,
        canModifyTenants,
    };
}

/**
 * HOC to protect platform-only routes
 */
export function withPlatformAccess<P extends object>(
    Component: React.ComponentType<P>,
    requiredRole?: "platform_owner" | "platform_admin" | "platform_support"
) {
    return function ProtectedComponent(props: P) {
        const { isPlatform, platformRole, loading } = usePlatformAuth();
        const router = useRouter();
        const { toast } = useToast();

        useEffect(() => {
            if (!loading && !isPlatform) {
                toast({
                    title: "Access Denied",
                    description: "Platform administrator access required",
                    variant: "destructive",
                });
                router.push("/dashboard");
            }

            if (
                !loading &&
                isPlatform &&
                requiredRole &&
                platformRole !== requiredRole
            ) {
                toast({
                    title: "Insufficient Permissions",
                    description: `${requiredRole} role required`,
                    variant: "destructive",
                });
                router.push("/platform/dashboard");
            }
        }, [isPlatform, platformRole, loading]);

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
            );
        }

        if (!isPlatform) return null;
        if (requiredRole && platformRole !== requiredRole) return null;

        return <Component {...props} />;
    };
}
