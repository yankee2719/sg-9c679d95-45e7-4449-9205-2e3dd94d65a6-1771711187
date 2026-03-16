import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hasMinimumRole, type OrgRole } from "@/services/organizationService";

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState < User | null > (null);
    const [session, setSession] = useState < Session | null > (null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState < AuthState["profile"] > (null);
    const [organization, setOrganization] = useState < AuthState["organization"] > (null);
    const [membership, setMembership] = useState < AuthState["membership"] > (null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

    const resetContext = useCallback(() => {
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setIsPlatformAdmin(false);
    }, []);

    const loadAuthContext = useCallback(async (currentUser: User) => {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, display_name, email, avatar_url, language, default_organization_id")
            .eq("id", currentUser.id)
            .maybeSingle();

        setProfile(profileData ?? null);

        let activeOrgId = profileData?.default_organization_id ?? null;

        if (!activeOrgId) {
            const { data: firstMembership } = await supabase
                .from("organization_memberships")
                .select("organization_id")
                .eq("user_id", currentUser.id)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

            activeOrgId = firstMembership?.organization_id ?? null;
        }

        if (activeOrgId) {
            const [{ data: orgData }, { data: membershipData }] = await Promise.all([
                supabase
                    .from("organizations")
                    .select("id, name, slug, type, subscription_status")
                    .eq("id", activeOrgId)
                    .maybeSingle(),
                supabase
                    .from("organization_memberships")
                    .select("id, role, is_active")
                    .eq("organization_id", activeOrgId)
                    .eq("user_id", currentUser.id)
                    .eq("is_active", true)
                    .maybeSingle(),
            ]);

            setOrganization(orgData ?? null);
            setMembership((membershipData as AuthState["membership"]) ?? null);
        } else {
            setOrganization(null);
            setMembership(null);
        }

        const { data: adminData } = await supabase
            .from("platform_admins")
            .select("id")
            .eq("user_id", currentUser.id)
            .eq("is_active", true)
            .maybeSingle();

        setIsPlatformAdmin(!!adminData);
    }, []);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            const { data } = await supabase.auth.getSession();
            const currentSession = data.session ?? null;

            if (!mounted) return;

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                try {
                    await loadAuthContext(currentSession.user);
                } catch (error) {
                    console.error("Error loading auth context:", error);
                    resetContext();
                }
            } else {
                resetContext();
            }

            if (mounted) setLoading(false);
        };

        init();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
            setSession(nextSession ?? null);
            setUser(nextSession?.user ?? null);

            if (nextSession?.user) {
                try {
                    await loadAuthContext(nextSession.user);
                } catch (error) {
                    console.error("Error loading auth context:", error);
                    resetContext();
                }
            } else {
                resetContext();
            }

            setLoading(false);
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

            await supabase.from("profiles").update({ default_organization_id: orgId }).eq("id", user.id);
            await loadAuthContext(user);
        },
        [loadAuthContext, user]
    );

    const refresh = useCallback(async () => {
        if (!user) return;
        await loadAuthContext(user);
    }, [loadAuthContext, user]);

    const role = (membership?.role as string | null) ?? null;
    const isOwner = role === "owner";
    const isAdmin = ["owner", "admin"].includes(role ?? "");
    const shouldEnforceMfa = isPlatformAdmin || ["owner", "admin", "supervisor"].includes(role ?? "");
    const canManageMembers = isAdmin || isPlatformAdmin;
    const canManagePlants = isAdmin || isPlatformAdmin;
    const canManageMachines = isAdmin || isPlatformAdmin;
    const canExecuteWorkOrders = ["owner", "admin", "supervisor", "technician"].includes(role ?? "") || (role ? hasMinimumRole(role as OrgRole, "technician") : false);
    const canViewOnly = role === "viewer";

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
        shouldEnforceMfa,
        canManageMembers,
        canManagePlants,
        canManageMachines,
        canExecuteWorkOrders,
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
