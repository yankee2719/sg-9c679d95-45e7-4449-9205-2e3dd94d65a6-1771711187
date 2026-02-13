// ============================================================================
// USE AUTH HOOK
// ============================================================================
// File: src/hooks/useCurrentUser.ts
// Hook per ottenere l'utente corrente da Supabase
// ============================================================================

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface User {
    id: string;
    email?: string;
    // Aggiungi altri campi se necessario
}

export function useCurrentUser() {
    const [user, setUser] = useState < User | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get initial user
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user || null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { user, loading };
}