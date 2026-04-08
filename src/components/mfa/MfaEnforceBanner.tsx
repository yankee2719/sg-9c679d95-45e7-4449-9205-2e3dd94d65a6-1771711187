// src/components/mfa/MfaEnforceBanner.tsx
// ============================================================================
// MFA ENFORCE BANNER — Persistent warning for admin/supervisor without 2FA
// ============================================================================

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MfaEnforceBanner() {
    const { shouldEnforceMfa, membership } = useAuth();
    const router = useRouter();

    if (!shouldEnforceMfa) return null;

    // Non mostrare nella pagina settings stessa
    if (router.pathname.startsWith('/settings')) return null;

    const roleLabel = membership?.role === 'supervisor' ? 'supervisore' : 'amministratore';

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                        <strong>Sicurezza richiesta:</strong>{' '}
                        Come {roleLabel} dell'organizzazione, devi attivare
                        l'autenticazione a due fattori per proteggere i dati.
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                    onClick={() => router.push('/settings')}
                >
                    Attiva 2FA
                </Button>
            </div>
        </div>
    );
}


