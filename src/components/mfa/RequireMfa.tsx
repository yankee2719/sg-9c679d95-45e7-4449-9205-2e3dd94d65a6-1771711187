// src/components/mfa/RequireMfa.tsx
// ============================================================================
// REQUIRE MFA — Route guard for sensitive pages
// ============================================================================
// Wraps page content. If admin/owner doesn't have 2FA, shows block screen
// with redirect to settings. Non-admin users pass through normally.
// ============================================================================

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

interface RequireMfaProps {
    children: ReactNode;
}

export function RequireMfa({ children }: RequireMfaProps) {
    const { shouldEnforceMfa, isAuthenticated } = useAuth();
    const router = useRouter();

    if (!isAuthenticated) return null;
    if (!shouldEnforceMfa) return <>{children}</>;

    return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-3">
                        <ShieldX className="h-12 w-12 text-amber-500" />
                    </div>
                    <CardTitle>Autenticazione 2FA Richiesta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Per accedere a questa sezione devi prima attivare
                        l'autenticazione a due fattori. Questo è richiesto
                        per tutti gli amministratori dell'organizzazione.
                    </p>
                    <Button
                        onClick={() => router.push('/settings')}
                        className="w-full"
                    >
                        Vai alle Impostazioni di Sicurezza
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}