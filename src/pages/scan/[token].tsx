import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '@/contexts/LanguageContext';
import { getQrTokenService } from '@/services/offlineAndQrService';
import { authService } from '@/services/authService';
import { Loader2, ShieldCheck, ShieldAlert, WifiOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScanState = 'loading' | 'redirecting' | 'denied' | 'offline_success' | 'error' | 'auth_required';

export default function ScanPage() {
    const router = useRouter();
    const { token } = router.query;
    const { t } = useLanguage();

    const [state, setState] = useState < ScanState > ('loading');
    const [denialReason, setDenialReason] = useState('');
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!router.isReady || !token || typeof token !== 'string') return;
        void handleScan(token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady, token]);

    const tryOfflineAccess = (tokenValue: string) => {
        setIsOffline(true);
        const qrService = getQrTokenService();
        const offlineResult = qrService.validateTokenOffline(tokenValue);
        if (offlineResult?.is_valid && offlineResult.equipment_id) {
            setState('offline_success');
            setTimeout(() => {
                void router.push(`/equipment/${offlineResult.equipment_id}/maintenance?from=qr&offline=true`);
            }, 1200);
            return true;
        }
        if (offlineResult && !offlineResult.is_valid) {
            setDenialReason(offlineResult.denial_reason || 'access_denied');
            setState('denied');
            return true;
        }
        return false;
    };

    const handleScan = async (tokenValue: string) => {
        const qrService = getQrTokenService();

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            if (!tryOfflineAccess(tokenValue)) {
                setState('error');
            }
            return;
        }

        try {
            const session = await authService.getCurrentSession();
            if (!session?.access_token) {
                if (!tryOfflineAccess(tokenValue)) {
                    setState('auth_required');
                }
                return;
            }

            const res = await fetch('/api/qr/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ token: tokenValue }),
            });
            const payload = await res.json();

            if (res.ok) {
                const { equipment_id, allowed_views = [], max_permission_level } = payload;
                qrService.cacheTokenForOffline(tokenValue, {
                    equipment_id,
                    allowed_views,
                    max_permission_level,
                    is_active: true,
                });
                setState('redirecting');
                void router.push(`/equipment/${equipment_id}?from=qr&views=${allowed_views.join(',')}`);
                return;
            }

            setDenialReason(payload?.denial_reason || 'access_denied');
            setState('denied');
        } catch {
            if (!tryOfflineAccess(tokenValue)) {
                setState('error');
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
                {state === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{t('scan.validating') || 'Validazione QR in corso'}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('scan.wait') || 'Attendi un istante...'}</p>
                        </div>
                    </div>
                )}

                {state === 'redirecting' && (
                    <div className="space-y-4">
                        <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
                        <div>
                            <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">{t('scan.accessGranted') || 'Accesso consentito'}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('scan.redirecting') || 'Reindirizzamento alla macchina...'}</p>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-green-600" />
                    </div>
                )}

                {state === 'offline_success' && (
                    <div className="space-y-4">
                        <div className="flex justify-center gap-2">
                            <ShieldCheck className="h-10 w-10 text-green-600" />
                            <WifiOff className="mt-1 h-8 w-8 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{t('scan.offlineAccess') || 'Accesso offline consentito'}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t('scan.offlineNote') || 'Dati salvati in locale, potrebbero non essere aggiornati.'}</p>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-green-600" />
                    </div>
                )}

                {state === 'auth_required' && (
                    <div className="space-y-4">
                        <LogIn className="mx-auto h-12 w-12 text-blue-500" />
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{t('login.title') || 'Accesso richiesto'}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {t('scan.authRequired') || 'Per validare il QR devi prima accedere a MACHINA con il tuo utente.'}
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => void router.push('/dashboard')}>
                                {t('nav.dashboard') || 'Dashboard'}
                            </Button>
                            <Button onClick={() => void router.push('/login')}>
                                {t('auth.signIn') || 'Accedi'}
                            </Button>
                        </div>
                    </div>
                )}

                {state === 'denied' && (
                    <div className="space-y-4">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
                        <div>
                            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">{t('scan.accessDenied') || 'Accesso negato'}</h2>
                            <p className="mt-1 text-sm capitalize text-muted-foreground">{denialReason.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {denialReason === 'expired' && <p>{t('scan.reasonExpired') || 'Questo QR code è scaduto.'}</p>}
                            {denialReason === 'revoked' && <p>{t('scan.reasonRevoked') || 'Questo QR code è stato revocato.'}</p>}
                            {denialReason === 'max_scans_exceeded' && <p>{t('scan.reasonMaxScans') || 'Numero massimo di utilizzi raggiunto.'}</p>}
                            {!['expired', 'revoked', 'max_scans_exceeded'].includes(denialReason) && (
                                <p>{t('scan.reasonGeneric') || 'Non hai i permessi per accedere a questa macchina.'}</p>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => void router.push('/dashboard')}>
                            {t('nav.dashboard') || 'Dashboard'}
                        </Button>
                    </div>
                )}

                {state === 'error' && (
                    <div className="space-y-4">
                        {isOffline ? <WifiOff className="mx-auto h-12 w-12 text-orange-500" /> : <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />}
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {isOffline ? t('scan.noOfflineData') || 'Nessun dato offline disponibile' : t('scan.error') || 'Si è verificato un errore'}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isOffline
                                    ? t('scan.noOfflineDataDesc') || 'Sei offline e questo QR non è stato ancora memorizzato.'
                                    : t('scan.errorDesc') || 'Impossibile validare il QR code. Riprova.'}
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => void router.push('/dashboard')}>
                                {t('nav.dashboard') || 'Dashboard'}
                            </Button>
                            <Button onClick={() => { setState('loading'); void handleScan(token as string); }}>
                                {t('scan.retry') || 'Riprova'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

