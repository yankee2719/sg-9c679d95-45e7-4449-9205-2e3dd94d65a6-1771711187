import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
    | "owner"
    | "admin"
    | "supervisor"
    | "plant_manager"
    | "technician"
    | "operator"
    | "viewer"
    | string;

export interface AuthProfile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    language: string;
    default_organization_id: string | null;
}

export interface AuthOrganization {
    id: string;
    name: string;
    slug: string;
    type: string;
    subscription_status: string;
}

export interface AuthMembership {
    id: string;
    organization_id: string;
    role: AppRole;
    is_active: boolean;
    organization: AuthOrganization | null;
}

export interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    profile: AuthProfile | null;
    organization: AuthOrganization | null;
    membership: AuthMembership | null;
    memberships: AuthMembership[];
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

const ROLE_RANK: Record<string, number> = {
    viewer: 1,
    operator: 2,
    technician: 3,
    plant_manager: 4,
    supervisor: 5,
    admin: 6,
    owner: 7,
};

function getRoleRank(role: string | null | undefined): number {
    if (!role) return 0;
    return ROLE_RANK[role] ?? 0;
}

function normalizeProfile(row: any): AuthProfile | null {
    if (!row?.id) return null;

    return {
        id: String(row.id),
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        display_name: row.display_name ?? null,
        email: row.email ?? null,
        avatar_url: row.avatar_url ?? null,
        language: row.language ?? "it",
        default_organization_id: row.default_organization_id ?? null,
    };
}

function normalizeOrganization(row: any): AuthOrganization | null {
    if (!row?.id) return null;

    return {
        id: String(row.id),
        name: String(row.name ?? ""),
        slug: String(row.slug ?? ""),
        type: String(row.type ?? ""),
        subscription_status: String(row.subscription_status ?? ""),
    };
}

function normalizeMembership(row: any): AuthMembership | null {
    if (!row?.id || !row?.organization_id) return null;

    return {
        id: String(row.id),
        organization_id: String(row.organization_id),
        role: (row.role ?? "viewer") as AppRole,
        is_active: Boolean(row.is_active),
        organization: normalizeOrganization(row.organization),
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState < User | null > (null);
    const [session, setSession] = useState < Session | null > (null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState < AuthProfile | null > (null);
    const [organization, setOrganization] = useState < AuthOrganization | null > (null);
    const [membership, setMembership] = useState < AuthMembership | null > (null);
    const [memberships, setMemberships] = useState < AuthMembership[] > ([]);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

    const requestIdRef = useRef(0);

    const resetContext = useCallback(() => {
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setMemberships([]);
        setIsPlatformAdmin(false);
    }, []);

    const loadAuthContext = useCallback(async (currentUser: User) => {
        const requestId = ++requestIdRef.current;

        const [
            { data: profileData, error: profileError },
            { data: adminData, error: adminError },
            { data: membershipRows, error: membershipsError },
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select(
                    "id, first_name, last_name, display_name, email, avatar_url, language, default_organization_id"
                )
                .eq("id", currentUser.id)
                .maybeSingle(),
            supabase
                .from("platform_admins")
                .select("id")
                .eq("user_id", currentUser.id)
                .eq("is_active", true)
                .maybeSingle(),
            supabase
                .from("organization_memberships")
                .select(`
                    id,
                    organization_id,
                    role,
                    is_active,
                    organization:organizations (
                        id,
                        name,
                        slug,
                        type,
                        subscription_status
                    )
                `)
                .eq("user_id", currentUser.id)
                .eq("is_active", true),
        ]);

        if (profileError) throw profileError;
        if (adminError) throw adminError;
        if (membershipsError) throw membershipsError;
        if (requestId !== requestIdRef.current) return;

        const normalizedProfile = normalizeProfile(profileData);
        const normalizedMemberships = ((membershipRows ?? []) as any[])
            .map(normalizeMembership)
            .filter(Boolean) as AuthMembership[];

        const defaultOrgId = normalizedProfile?.default_organization_id ?? null;
        const selectedMembership =
            normalizedMemberships.find((item) => item.organization_id === defaultOrgId) ??
            normalizedMemberships[0] ??
            null;

        setProfile(normalizedProfile);
        setIsPlatformAdmin(Boolean(adminData));
        setMemberships(normalizedMemberships);
        setMembership(selectedMembership);
        setOrganization(selectedMembership?.organization ?? null);
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

        void supabase.auth
            .getSession()
            .then(({ data }) => applySession(data.session ?? null))
            .catch((error) => {
                console.error("Initial session load error:", error);
                if (mounted) {
                    resetContext();
                    setLoading(false);
                }
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
            if (!user) {
                throw new Error("Utente non autenticato");
            }

            const allowed = memberships.some((item) => item.organization_id === orgId);
            if (!allowed) {
                throw new Error("Organizzazione non disponibile nelle membership attive");
            }

            const { error } = await supabase
                .from("profiles")
                .update({ default_organization_id: orgId } as any)
                .eq("id", user.id);

            if (error) throw error;

            await loadAuthContext(user);
        },
        [loadAuthContext, memberships, user]
    );

    const refresh = useCallback(async () => {
        if (!user) return;
        await loadAuthContext(user);
    }, [loadAuthContext, user]);

    const role = membership?.role ?? null;
    const roleRank = getRoleRank(role);

    const value = useMemo < AuthState > (() => {
        const isOwner = role === "owner";
        const isAdmin = role === "owner" || role === "admin";
        const shouldEnforceMfa = isPlatformAdmin || roleRank >= getRoleRank("supervisor");
        const canManageMembers = isPlatformAdmin || isAdmin;
        const canManagePlants = isPlatformAdmin || roleRank >= getRoleRank("supervisor");
        const canManageMachines = isPlatformAdmin || roleRank >= getRoleRank("supervisor");
        const canExecuteWorkOrders = isPlatformAdmin || roleRank >= getRoleRank("technician");
        const canViewOnly = role === "viewer";

        return {
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
            canManageMembers,
            canManagePlants,
            canManageMachines,
            canExecuteWorkOrders,
            canViewOnly,
            signOut,
            switchOrganization,
            refresh,
        };
    }, [
            user,
            session,
            loading,
            profile,
            organization,
            membership,
            memberships,
            isPlatformAdmin,
            role,
            roleRank,
            signOut,
            switchOrganization,
            refresh,
        ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}