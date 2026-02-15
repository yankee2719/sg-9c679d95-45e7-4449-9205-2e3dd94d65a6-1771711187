// src/hooks/useAuth.tsx
// ============================================================================
// UNIFIED AUTH HOOK — replaces useAuth + useOrganization + usePlatformAuth
// ============================================================================
// Single source of truth for:
//   - Authentication state (session/user)
//   - Current organization + membership (role)
//   - Platform admin status
//   - Plant access context
//
// The old codebase had THREE conflicting hooks:
//   - useAuth: tenant_id based, roles on profile (admin/supervisor/technician)
//   - useOrganization: organization_memberships based (never connected)
//   - usePlatformAuth: JWT claims based (never connected)
//
// This hook uses organization_memberships as the SINGLE auth model.
// ============================================================================

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { OrgRole, hasMinimumRole } from '@/services/organizationService';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthState {
    // Session
    user: User | null;
    session: Session | null;
    loading: boolean;

    // Profile
    profile: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        display_name: string | null;
        email: string | null;
        avatar_url: string | null;
        language: string;
        default_organization_id: string | null;
    } | null;

    // Organization context
    organization: {
        id: string;
        name: string;
        slug: string;
        type: string;
        subscription_status: string;
    } | null;

    membership: {
        id: string;
        role: OrgRole;
        is_active: boolean;
    } | null;

    // Platform
    isPlatformAdmin: boolean;

    // Computed permissions
    isAuthenticated: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    canManageMembers: boolean;
    canManagePlants: boolean;
    canManageMachines: boolean;
    canExecuteWorkOrders: boolean;
    canViewOnly: boolean;

    // Actions
    signOut: () => Promise<void>;
    switchOrganization: (orgId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext < AuthState | undefined > (undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState < User | null > (null);
    const [session, setSession] = useState < Session | null > (null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState < AuthState['profile'] > (null);
    const [organization, setOrganization] = useState < AuthState['organization'] > (null);
    const [membership, setMembership] = useState < AuthState['membership'] > (null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

    // ─── Load full auth context ──────────────────────────────────────────

    const loadAuthContext = useCallback(async (currentUser: User) => {
        try {
            // 1. Load profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, display_name, email, avatar_url, language, default_organization_id')
                .eq('id', currentUser.id)
                .single();

            setProfile(profileData);

            if (!profileData) return;

            // 2. Determine active organization
            let activeOrgId = profileData.default_organization_id;

            if (!activeOrgId) {
                // Fallback: first active membership
                const { data: firstMembership } = await supabase
                    .from('organization_memberships')
                    .select('organization_id')
                    .eq('user_id', currentUser.id)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                activeOrgId = firstMembership?.organization_id || null;
            }

            if (activeOrgId) {
                // 3. Load organization
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('id, name, slug, type, subscription_status')
                    .eq('id', activeOrgId)
                    .single();

                setOrganization(orgData);

                // 4. Load membership (role in this org)
                const { data: membershipData } = await supabase
                    .from('organization_memberships')
                    .select('id, role, is_active')
                    .eq('organization_id', activeOrgId)
                    .eq('user_id', currentUser.id)
                    .eq('is_active', true)
                    .single();

                setMembership(membershipData);
            }

            // 5. Check platform admin
            const { data: adminData } = await supabase
                .from('platform_admins')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .maybeSingle();

            setIsPlatformAdmin(!!adminData);

        } catch (error) {
            console.error('Error loading auth context:', error);
        }
    }, []);

    // ─── Initialize ──────────────────────────────────────────────────────

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setUser(s?.user || null);

            if (s?.user) {
                loadAuthContext(s.user).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setUser(s?.user || null);

            if (s?.user) {
                loadAuthContext(s.user).finally(() => setLoading(false));
            } else {
                setProfile(null);
                setOrganization(null);
                setMembership(null);
                setIsPlatformAdmin(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadAuthContext]);

    // ─── Actions ─────────────────────────────────────────────────────────

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setIsPlatformAdmin(false);
    }, []);

    const switchOrganization = useCallback(async (orgId: string) => {
        if (!user) return;

        await supabase
            .from('profiles')
            .update({ default_organization_id: orgId })
            .eq('id', user.id);

        await loadAuthContext(user);
    }, [user, loadAuthContext]);

    const refresh = useCallback(async () => {
        if (user) await loadAuthContext(user);
    }, [user, loadAuthContext]);

    // ─── Computed permissions ────────────────────────────────────────────

    const role = membership?.role;
    const isOwner = role === 'owner';
    const isAdmin = role ? hasMinimumRole(role, 'admin') : false;
    const canManageMembers = isAdmin || isPlatformAdmin;
    const canManagePlants = isAdmin || isPlatformAdmin;
    const canManageMachines = isAdmin || isPlatformAdmin;
    const canExecuteWorkOrders = role ? hasMinimumRole(role, 'technician') : false;
    const canViewOnly = role === 'viewer';

    // ─── Context value ───────────────────────────────────────────────────

    const value: AuthState = {
        user,
        session,
        loading,
        profile,
        organization,
        membership,
        isPlatformAdmin,
        isAuthenticated: !!user,
        isOwner,
        isAdmin,
        canManageMembers,
        canManagePlants,
        canManageMachines,
        canExecuteWorkOrders,
        canViewOnly,
        signOut,
        switchOrganization,
        refresh,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// ============================================================================
// GUARD COMPONENT
// ============================================================================

export function RequireAuth({
    children,
    minimumRole,
    fallback,
}: {
    children: ReactNode;
    minimumRole?: OrgRole;
    fallback?: ReactNode;
}) {
    const { isAuthenticated, loading, membership } = useAuth();

    if (loading) return null;
    if (!isAuthenticated) return fallback || null;

    if (minimumRole && membership) {
        if (!hasMinimumRole(membership.role, minimumRole)) {
            return fallback || null;
        }
    }

    return <>{children}</>;
}
