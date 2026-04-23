import { useAuth } from "@/hooks/useAuth";

export function useCurrentUser() {
    const { user, loading } = useAuth();
    return { user, loading };
}

export default useCurrentUser;
