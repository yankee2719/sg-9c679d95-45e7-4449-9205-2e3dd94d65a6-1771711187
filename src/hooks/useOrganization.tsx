import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
    organizationService,
    type Organization,
    type OrganizationMembership,
    type OrgRole,
} from '@/services/organizationService';

interface OrganizationContextType {
    organization: Organization | null;
    membership: OrganizationMembership | null;
    loading: boolean;
    error: Error | null;
    isOwner: boolean;
    isAdmin: boolean;
    canManageMembers: boolean;
    canManageMachines: boolean;
    refresh: () => Promise<void>;
}

const OrganizationContext = createContext < OrganizationContextType | undefined > (undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const [organization, setOrganization] = useState < Organization | null > (null);
    const [membership, setMembership] = useState < OrganizationMembership | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < Error | null > (null);

    const loadOrganization = async () => {
        try {
            setLoading(true);
            setError(null);

            const org = await organizationService.getCurrentOrganization();
            setOrganization(org);

            if (!org) {
                setMembership(null);
                return;
            }

            const currentMembership = await organizationService.getCurrentMembership(org.id);
            setMembership(currentMembership);
        } catch (err) {
            console.error('Error loading organization:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadOrganization();
    }, []);

    const role = membership?.role ?? null;
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;
    const canManageMembers = isAdmin;
    const canManageMachines = role ? ['owner', 'admin', 'plant_manager'].includes(role) : false;

    const value: OrganizationContextType = {
        organization,
        membership,
        loading,
        error,
        isOwner,
        isAdmin,
        canManageMembers,
        canManageMachines,
        refresh: loadOrganization,
    };

    return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within OrganizationProvider');
    }
    return context;
}

export function usePermission(permission: string) {
    const { membership } = useOrganization();

    if (!membership) return false;
    if (membership.role === 'owner') return true;

    const rolePermissions: Record<OrgRole, string[]> = {
        owner: ['manage_members', 'manage_machines', 'view_audit_logs', 'manage_settings'],
        admin: ['manage_members', 'manage_machines', 'view_audit_logs', 'manage_settings'],
        plant_manager: ['manage_machines', 'assign_machines', 'view_machines'],
        technician: ['view_assigned_machines', 'update_maintenance'],
        viewer: ['view_machines'],
    };

    return (rolePermissions[membership.role] || []).includes(permission);
}

export function useOrganizationMembers() {
    const { organization } = useOrganization();
    const [members, setMembers] = useState < any[] > ([]);
    const [loading, setLoading] = useState(false);

    const loadMembers = async () => {
        if (!organization) {
            setMembers([]);
            return;
        }

        setLoading(true);
        try {
            const data = await organizationService.getOrganizationMembers(organization.id);
            setMembers(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadMembers();
    }, [organization?.id]);

    return {
        members,
        loading,
        refresh: loadMembers,
    };
}

export function useOnboardingStatus() {
    const [completed, setCompleted] = useState < boolean | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const status = await organizationService.hasCompletedOnboarding();
            setCompleted(status);
            setLoading(false);
        };

        void checkStatus();
    }, []);

    return { completed, loading };
}

export function withOnboardingRequired<P extends object>(
    Component: React.ComponentType<P>
) {
    return function OnboardingGuard(props: P) {
        const router = useRouter();
        const { completed, loading } = useOnboardingStatus();

        useEffect(() => {
            if (!loading && !completed) {
                void router.push('/onboarding');
            }
        }, [completed, loading, router]);

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            );
        }

        if (!completed) return null;

        return <Component {...props} />;
    };
}

export function withRole(allowedRoles: OrgRole[]) {
    return function <P extends object>(Component: React.ComponentType<P>) {
        return function RoleGuard(props: P) {
            const router = useRouter();
            const { membership, loading } = useOrganization();

            useEffect(() => {
                if (!loading && (!membership || !allowedRoles.includes(membership.role))) {
                    void router.push('/dashboard');
                }
            }, [membership, loading, router]);

            if (loading) {
                return (
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    </div>
                );
            }

            if (!membership || !allowedRoles.includes(membership.role)) {
                return null;
            }

            return <Component {...props} />;
        };
    };
}

