import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { organizationService, type MembershipWithOrganization, type OrgRole } from "@/services/organizationService";
import { canExecuteWorkOrders, canManageMachines, canManageMembers, isViewOnlyRole, normalizeRole } from "@/lib/roles";

export interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
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
    memberships: MembershipWithOrganization[];
    isPlatformAdmin: boolean;
    isAuthenticated: boolean;
    isOwner: boolean;
    isAdmin: boolean;
    shouldEnforceMfa: boolean;
    canManageMembers: boolean;
    canManagePlants: boolean;
    canManageMachines: boolean;
    canExecuteWorkOrders: boolean;
    canViewOnly: boolean;
    signOut: () => Promise<void>;
    switchOrganization: (orgId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext < AuthState | undefined > (undefined);

type ProfileRow = AuthState["profile"];
type OrganizationRow = AuthState["organization"];
type MembershipRow = AuthState["membership"];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState < User | null > (null);
    const [session, setSession] = useState < Session | null > (null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState < ProfileRow > (null);
    const [organization, setOrganization] = useState < OrganizationRow > (null);
    const [membership, setMembership] = useState < MembershipRow > (null);
    const [memberships, setMemberships] = useState < MembershipWithOrganization[] > ([]);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const loadRequestIdRef = useRef(0);

    const resetContext = useCallback(() => {
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setMemberships([]);
        setIsPlatformAdmin(false);
    }, []);

    const loadAuthContext = useCallback(async (currentUser: User) => {
        const requestId = ++loadRequestIdRef.current;

        const [
            { data: profileData, error: profileError },
            { data: adminData, error: adminError },
            activeMemberships,
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, first_name, last_name, display_name, email, avatar_url, language, default_organization_id")
                .eq("id", currentUser.id)
                .maybeSingle(),
            supabase
                .from("platform_admins")
                .select("id")
                .eq("user_id", currentUser.id)
                .eq("is_active", true)
                .maybeSingle(),
            organizationService.getActiveMemberships(),
        ]);

        if (profileError) throw profileError;
        if (adminError) throw adminError;
        if (requestId !== loadRequestIdRef.current) return;

        setProfile((profileData as ProfileRow) ?? null);
        setIsPlatformAdmin(!!adminData);
        setMemberships(activeMemberships);

        let activeOrgId = profileData?.default_organization_id ?? null;

        if (!activeOrgId) {
            activeOrgId = activeMemberships[0]?.organization_id ?? null;
        }

        if (!activeOrgId) {
            if (requestId !== loadRequestIdRef.current) return;
            setOrganization(null);
            setMembership(null);
            return;
        }

        const activeMembership = activeMemberships.find((row) => row.organization_id === activeOrgId) ?? null;

        const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, slug, type, subscription_status")
            .eq("id", activeOrgId)
            .maybeSingle();

        if (orgError) throw orgError;
        if (requestId !== loadRequestIdRef.current) return;

        setOrganization((orgData as OrganizationRow) ?? null);
        setMembership(
            activeMembership
                ? {
                    id: activeMembership.id,
                    role: activeMembership.role,
                    is_active: activeMembership.is_active,
                }
                : null
        );
    }, []);

    useEffect(() => {
        let mounted = true;

        const applySession = async (nextSession: Session | null) => {
            if (!mounted) return;

            setSession(nextSession);
            setUser(nextSession?.user ?? null);

            if (!nextSession?.user) {
                resetContext();
                if (mounted) setLoading(false);
                return;
            }

            try {
                await loadAuthContext(nextSession.user);
            } catch (error) {
                console.error("Error loading auth context:", error);
                if (mounted) resetContext();
            } finally {
                if (mounted) setLoading(false);
            }
        };

        supabase.auth.getSession().then(({ data }) => {
            void applySession(data.session ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            void applySession(nextSession ?? null);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadAuthContext, resetContext]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        resetContext();
    }, [resetContext]);

    const switchOrganization = useCallback(
        async (orgId: string) => {
            if (!user) return;

            const { error } = await supabase.from("profiles").update({ default_organization_id: orgId }).eq("id", user.id);
            if (error) throw error;

            await loadAuthContext(user);
        },
        [loadAuthContext, user]
    );

    const refresh = useCallback(async () => {
        if (!user) return;
        await loadAuthContext(user);
    }, [loadAuthContext, user]);

    const role = normalizeRole(membership?.role ?? null);
    const isOwner = role === "admin";
    const isAdmin = role === "admin";
    const shouldEnforceMfa = isPlatformAdmin || role === "admin" || role === "supervisor";
    const canManageMembersValue = isPlatformAdmin || canManageMembers(role);
    const canManagePlants = isPlatformAdmin || canManageMachines(role);
    const canManageMachinesValue = isPlatformAdmin || canManageMachines(role);
    const canExecuteWorkOrdersValue = isPlatformAdmin || canExecuteWorkOrders(role);
    const canViewOnly = isViewOnlyRole(membership?.role ?? null);

    const value: AuthState = {
        user,
        session,
        loading,
        profile,
        organization,
        membership,
        memberships,
        isPlatformAdmin,
        isAuthenticated: !!user,
        isOwner,
        isAdmin,
        shouldEnforceMfa,
        canManageMembers: canManageMembersValue,
        canManagePlants,
        canManageMachines: canManageMachinesValue,
        canExecuteWorkOrders: canExecuteWorkOrdersValue,
        canViewOnly,
        signOut,
        switchOrganization,
        refresh,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
