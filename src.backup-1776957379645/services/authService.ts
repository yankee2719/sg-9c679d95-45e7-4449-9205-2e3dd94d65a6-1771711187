import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
    id: string;
    email: string;
    user_metadata?: any;
    created_at?: string;
}

export interface AuthError {
    message: string;
    code?: string;
}

// Dynamic URL Helper
const getURL = () => {
    let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ??
        process?.env?.NEXT_PUBLIC_SITE_URL ??
        'http://localhost:3000'

    if (!url) {
        url = 'http://localhost:3000';
    }

    url = url.startsWith('http') ? url : `https://${url}`
    url = url.endsWith('/') ? url : `${url}/`

    return url
}

export const authService = {
    async getCurrentUser(): Promise<AuthUser | null> {
        const { data: { user } } = await supabase.auth.getUser();
        return user ? {
            id: user.id,
            email: user.email || "",
            user_metadata: user.user_metadata,
            created_at: user.created_at
        } : null;
    },

    async getCurrentSession(): Promise<Session | null> {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    async signUp(email: string, password: string, fullName?: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${getURL()}auth/confirm-email`,
                    data: {
                        display_name: fullName || email.split("@")[0],
                        first_name: fullName?.split(' ')[0] || email.split("@")[0],
                        last_name: fullName?.split(' ').slice(1).join(' ') || null,
                    }
                }
            });

            if (error) {
                return { user: null, error: { message: error.message, code: error.status?.toString() } };
            }

            const authUser = data.user ? {
                id: data.user.id,
                email: data.user.email || "",
                user_metadata: data.user.user_metadata,
                created_at: data.user.created_at
            } : null;

            return { user: authUser, error: null };
        } catch (error) {
            return {
                user: null,
                error: { message: "An unexpected error occurred during sign up" }
            };
        }
    },

    async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { user: null, error: { message: error.message, code: error.status?.toString() } };
            }

            const authUser = data.user ? {
                id: data.user.id,
                email: data.user.email || "",
                user_metadata: data.user.user_metadata,
                created_at: data.user.created_at
            } : null;

            return { user: authUser, error: null };
        } catch (error) {
            return {
                user: null,
                error: { message: "An unexpected error occurred during sign in" }
            };
        }
    },

    async signOut(): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                return { error: { message: error.message } };
            }
            return { error: null };
        } catch (error) {
            return {
                error: { message: "An unexpected error occurred during sign out" }
            };
        }
    },

    async logout(): Promise<{ error: AuthError | null }> {
        return this.signOut();
    },

    async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${getURL()}auth/reset-password`,
            });
            if (error) {
                return { error: { message: error.message } };
            }
            return { error: null };
        } catch (error) {
            return {
                error: { message: "An unexpected error occurred during password reset" }
            };
        }
    },

    async confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: type
            });

            if (error) {
                return { user: null, error: { message: error.message, code: error.status?.toString() } };
            }

            const authUser = data.user ? {
                id: data.user.id,
                email: data.user.email || "",
                user_metadata: data.user.user_metadata,
                created_at: data.user.created_at
            } : null;

            return { user: authUser, error: null };
        } catch (error) {
            return {
                user: null,
                error: { message: "An unexpected error occurred during email confirmation" }
            };
        }
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange(callback);
    },

    async ensureProfile(userId: string, email: string): Promise<{ error: AuthError | null }> {
        // Profile is created automatically by handle_new_user trigger
        return { error: null };
    }
};