import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type OrganizationType = "manufacturer" | "customer" | null;

export interface AuthOrganization {
    id: string;
    name: string | null;
    type: OrganizationType;
    manufacturer_org_id?: string | null;
    slug?: string | null;
}

export interface AuthMembership {
    id: string;
    user_id: string;
    organization_id: string;
    role: string;
    is_active: boolean;
}

interface AuthContextValue {
    loading: boolean;
    session: Session | null;
    user: User | null;
    organization: AuthOrganization | null;
    membership: AuthMembership | null;
    memberships: AuthMembership[];
    shouldEnforceMfa: boolean;
    refreshUserContext: () => Promise<void>;
    setActiveOrganization: (organizationId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const ACTIVE_ORG_KEY = "machina_active_org_id";

const AuthContext = createContext < AuthContextValue | undefined > (undefined);

function shallowEqualMembership(a: AuthMembership | null, b: AuthMembership | null) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
        a.id === b.id &&
        a.user_id === b.user_id &&
        a.organization_id === b.organization_id &&
        a.role === b.role &&
        a.is_active === b.is_active
    );
}

function shallowEqualOrganization(a: AuthOrganization | null, b: AuthOrganization | null) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
        a.id === b.id &&
        a.name === b.name &&
        a.type === b.type &&
        a.manufacturer_org_id === b.manufacturer_org_id &&
        a.slug === b.slug
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState < Session | null > (null);
    const [user, setUser] = useState < User | null > (null);
    const [organization, setOrganization] = useState < AuthOrganization | null > (null);
    const [membership, setMembership] = useState < AuthMembership | null > (null);
    const [memberships, setMemberships] = useState < AuthMembership[] > ([]);

    const initializedRef = useRef(false);
    const refreshInFlightRef = useRef < Promise < void> | null > (null);

    const refreshUserContext = useCallback(async () => {
        if (refreshInFlightRef.current) {
            return refreshInFlightRef.current;
        }

        refreshInFlightRef.current = (async () => {
            try {
                setLoading(true);

                const {
                    data: { session: currentSession },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                const currentUser = currentSession?.user ?? null;

                setSession((prev) =>
                    prev?.access_token === currentSession?.access_token ? prev : currentSession ?? null
                );
                setUser((prev) => (prev?.id === currentUser?.id ? prev : currentUser));

                if (!currentUser) {
                    setOrganization(null);
                    setMembership(null);
                    setMemberships([]);
                    localStorage.removeItem(ACTIVE_ORG_KEY);
                    return;
                }

                const { data: membershipRows, error: membershipError } = await supabase
                    .from("organization_memberships")
                    .select("id, user_id, organization_id, role, is_active")
                    .eq("user_id", currentUser.id)
                    .eq("is_active", true);

                if (membershipError) throw membershipError;

                const nextMemberships = (membershipRows ?? []) as AuthMembership[];
                setMemberships(nextMemberships);

                if (nextMemberships.length === 0) {
                    setOrganization(null);
                    setMembership(null);
                    localStorage.removeItem(ACTIVE_ORG_KEY);
                    return;
                }

                const storedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
                const chosenMembership =
                    nextMemberships.find((row) => row.organization_id === storedOrgId) ??
                    nextMemberships[0];

                if (!storedOrgId || storedOrgId !== chosenMembership.organization_id) {
                    localStorage.setItem(ACTIVE_ORG_KEY, chosenMembership.organization_id);
                }

                const { data: orgRow, error: orgError } = await supabase
                    .from("organizations")
                    .select("id, name, type, manufacturer_org_id, slug")
                    .eq("id", chosenMembership.organization_id)
                    .maybeSingle();

                if (orgError) throw orgError;

                const nextOrganization = (orgRow as AuthOrganization | null) ?? null;

                setMembership((prev) =>
                    shallowEqualMembership(prev, chosenMembership) ? prev : chosenMembership
                );

                setOrganization((prev) =>
                    shallowEqualOrganization(prev, nextOrganization) ? prev : nextOrganization
                );
            } catch (error) {
                console.error("useAuth refreshUserContext error:", error);
            } finally {
                setLoading(false);
                refreshInFlightRef.current = null;
            }
        })();

        return refreshInFlightRef.current;
    }, []);

    const setActiveOrganization = useCallback(
        async (organizationId: string) => {
            localStorage.setItem(ACTIVE_ORG_KEY, organizationId);
            await refreshUserContext();
        },
        [refreshUserContext]
    );

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(ACTIVE_ORG_KEY);
        setSession(null);
        setUser(null);
        setOrganization(null);
        setMembership(null);
        setMemberships([]);
    }, []);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        void refreshUserContext();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession((prev) =>
                prev?.access_token === nextSession?.access_token ? prev : nextSession ?? null
            );
            setUser((prev) => (prev?.id === nextSession?.user?.id ? prev : nextSession?.user ?? null));
            void refreshUserContext();
        });

        const handleStorage = (e: StorageEvent) => {
            if (e.key === ACTIVE_ORG_KEY) {
                void refreshUserContext();
            }
        };

        window.addEventListener("storage", handleStorage);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener("storage", handleStorage);
        };
    }, [refreshUserContext]);

    const shouldEnforceMfa = useMemo(() => {
        if (!user) return false;
        const role = membership?.role ?? "";
        return ["owner", "admin", "supervisor"].includes(role);
    }, [user, membership?.role]);

    const value = useMemo < AuthContextValue > (
        () => ({
            loading,
            session,
            user,
            organization,
            membership,
            memberships,
            shouldEnforceMfa,
            refreshUserContext,
            setActiveOrganization,
            signOut,
        }),
        [
            loading,
            session,
            user,
            organization,
            membership,
            memberships,
            shouldEnforceMfa,
            refreshUserContext,
            setActiveOrganization,
            signOut,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}