// src/hooks/useOrganization.tsx
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { organizationService } from '@/services/organizationService';
import type { Database } from '@/integrations/supabase/types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type OrganizationMembership = Database['public']['Tables']['organization_memberships']['Row'];

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

/**
 * Provider component that wraps your app and makes organization data
 * available to any child component that calls useOrganization()
 */
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

            if (org) {
                const role = await organizationService.getUserRole(org.id);
                if (role) {
                    // Create a minimal membership object
                    setMembership({
                        id: '',
                        user_id: '',
                        organization_id: org.id,
                        role: role as any,
                        status: 'active',
                        joined_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        permissions: [],
                        invited_by: null,
                        invitation_token: null,
                        invitation_expires_at: null,
                        left_at: null,
                    });
                }
            }
        } catch (err) {
            console.error('Error loading organization:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrganization();
    }, []);

    // Computed permissions
    const isOwner = membership?.role === 'owner';
    const isAdmin = membership?.role === 'admin' || isOwner;
    const canManageMembers = isAdmin;
    const canManageMachines = membership?.role && ['owner', 'admin', 'manager'].includes(membership.role);

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

    return (
        <OrganizationContext.Provider value={value}>
            {children}
        </OrganizationContext.Provider>
    );
}

/**
 * Hook to access current organization context
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { organization, isOwner } = useOrganization();
 *   
 *   if (!organization) return <div>No organization</div>;
 *   
 *   return (
 *     <div>
 *       <h1>{organization.name}</h1>
 *       {isOwner && <button>Owner Actions</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within OrganizationProvider');
    }
    return context;
}

/**
 * Hook for checking specific permissions
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = usePermission('delete_machines');
 *   
 *   if (!canDelete) return null;
 *   
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function usePermission(permission: string) {
    const { membership } = useOrganization();

    if (!membership) return false;

    // Owners have all permissions
    if (membership.role === 'owner') return true;

    // Check role-based permissions
    const rolePermissions: Record<string, string[]> = {
        admin: ['manage_members', 'manage_machines', 'view_audit_logs', 'manage_settings'],
        manager: ['manage_machines', 'assign_machines', 'view_machines'],
        member: ['view_machines', 'create_logs'],
        technician: ['view_assigned_machines', 'update_maintenance'],
        viewer: ['view_machines'],
    };

    const permissions = rolePermissions[membership.role] || [];
    return permissions.includes(permission);
}

/**
 * Hook for managing organization members
 */
export function useOrganizationMembers() {
    const { organization } = useOrganization();
    const [members, setMembers] = useState < any[] > ([]);
    const [loading, setLoading] = useState(false);

    const loadMembers = async () => {
        if (!organization) return;

        setLoading(true);
        const { members: data } = await organizationService.getOrganizationMembers(organization.id);
        setMembers(data);
        setLoading(false);
    };

    useEffect(() => {
        loadMembers();
    }, [organization?.id]);

    return {
        members,
        loading,
        refresh: loadMembers,
    };
}

/**
 * Hook to check if user has completed onboarding
 * Useful for route guards
 */
export function useOnboardingStatus() {
    const [completed, setCompleted] = useState < boolean | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const status = await organizationService.hasCompletedOnboarding();
            setCompleted(status);
            setLoading(false);
        };

        checkStatus();
    }, []);

    return { completed, loading };
}

/**
 * Higher-order component that redirects to onboarding if not completed
 * @example
 * ```tsx
 * export default withOnboardingRequired(DashboardPage);
 * ```
 */
export function withOnboardingRequired<P extends object>(
    Component: React.ComponentType<P>
) {
    return function OnboardingGuard(props: P) {
        const router = useRouter();
        const { completed, loading } = useOnboardingStatus();

        useEffect(() => {
            if (!loading && !completed) {
                router.push('/onboarding');
            }
        }, [completed, loading]);

        if (loading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            );
        }

        if (!completed) {
            return null;
        }

        return <Component {...props} />;
    };
}

/**
 * Higher-order component that requires specific role
 * @example
 * ```tsx
 * export default withRole(['owner', 'admin'])(SettingsPage);
 * ```
 */
export function withRole(allowedRoles: string[]) {
    return function <P extends object>(Component: React.ComponentType<P>) {
        return function RoleGuard(props: P) {
            const router = useRouter();
            const { membership, loading } = useOrganization();

            useEffect(() => {
                if (!loading && (!membership || !allowedRoles.includes(membership.role))) {
                    router.push('/dashboard');
                }
            }, [membership, loading]);

            if (loading) {
                return (
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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