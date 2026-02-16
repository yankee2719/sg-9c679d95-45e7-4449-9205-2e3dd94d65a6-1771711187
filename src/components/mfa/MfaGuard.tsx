// src/components/mfa/MfaGuard.tsx
// ============================================================================
// MFA GUARD — Wraps the app to enforce MFA verification after login
// ============================================================================
// Usage in _app.tsx:
//
//   <AuthProvider>
//     <MfaGuard>
//       <Component {...pageProps} />
//     </MfaGuard>
//   </AuthProvider>
//
// Flow:
//   1. User logs in (aal1)
//   2. MfaGuard checks AAL level
//   3. If user has MFA enabled (nextLevel = aal2), shows MfaChallenge
//   4. After verification (aal2), renders the app
//   5. If user has no MFA, passes through immediately
// ============================================================================

import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { mfaService } from '@/services/mfaService';
import { MfaChallenge } from './MfaChallenge';
import { Loader2 } from 'lucide-react';

interface MfaGuardProps {
    children: ReactNode;
    /**
     * Pages that should NOT require MFA (e.g., login, register, public pages).
     * Pass current pathname to skip MFA check on these routes.
     */
    excludePaths?: string[];
    currentPath?: string;
}

export function MfaGuard({ children, excludePaths, currentPath }: MfaGuardProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaChecked, setMfaChecked] = useState(false);
    const [checking, setChecking] = useState(false);

    // Skip MFA check for excluded paths
    const isExcluded = excludePaths?.some(path => currentPath?.startsWith(path)) ?? false;

    useEffect(() => {
        if (!isAuthenticated || isExcluded || authLoading) {
            setMfaChecked(true);
            setMfaRequired(false);
            return;
        }

        const checkMfa = async () => {
            setChecking(true);
            try {
                const needs = await mfaService.needsVerification();
                setMfaRequired(needs);
            } catch {
                // If check fails, don't block the user
                setMfaRequired(false);
            } finally {
                setMfaChecked(true);
                setChecking(false);
            }
        };

        checkMfa();
    }, [isAuthenticated, isExcluded, authLoading]);

    // Still loading auth
    if (authLoading || (!mfaChecked && isAuthenticated)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // MFA verification needed
    if (mfaRequired && isAuthenticated && !isExcluded) {
        return (
            <MfaChallenge
                onVerified={() => {
                    setMfaRequired(false);
                }}
                onCancel={() => {
                    setMfaRequired(false);
                }}
            />
        );
    }

    // All clear — render app
    return <>{children}</>;
}