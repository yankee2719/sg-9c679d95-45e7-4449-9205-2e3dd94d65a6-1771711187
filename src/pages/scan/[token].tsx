// ============================================================================
// QR SCAN LANDING PAGE
// ============================================================================
// File: pages/scan/[token].tsx
// Pagina di atterraggio dopo scan QR - gestisce online e offline
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getQrTokenService } from '@/services/offlineAndQrService';
import { Loader2, ShieldCheck, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScanState = 'loading' | 'redirecting' | 'denied' | 'offline_success' | 'error';

export default function ScanPage() {
    const router = useRouter();
    const { token } = router.query;

    const [state, setState] = useState < ScanState > ('loading');
    const [denialReason, setDenialReason] = useState < string > ('');
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!router.isReady || !token || typeof token !== 'string') return;
        handleScan(token);
    }, [router.isReady, token]);

    const handleScan = async (tokenValue: string) => {
        const qrService = getQrTokenService();

        try {
            // ---------------------------------------------------------------
            // ATTEMPT ONLINE VALIDATION
            // ---------------------------------------------------------------
            const res = await fetch('/api/qr/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: tokenValue }),
            });

            if (res.ok) {
                const { equipment_id, allowed_views } = await res.json();

                // Cache token for future offline use
                qrService.cacheTokenForOffline(tokenValue, { equipment_id, allowed_views, is_active: true });

                setState('redirecting');
                router.push(`/equipment/${equipment_id}?from=qr&views=${allowed_views.join(',')}`);
                return;
            }

            // Server rejected
            const { denial_reason } = await res.json();
            setDenialReason(denial_reason || 'Access denied');
            setState('denied');

        } catch {
            // ---------------------------------------------------------------
            // NETWORK ERROR - TRY OFFLINE
            // ---------------------------------------------------------------
            setIsOffline(true);
            const offlineResult = qrService.validateTokenOffline(tokenValue);

            if (offlineResult?.is_valid && offlineResult.equipment_id) {
                setState('offline_success');
                setTimeout(() => {
                    router.push(`/equipment/${offlineResult.equipment_id}?from=qr&offline=true`);
                }, 1500);
                return;
            }

            if (offlineResult && !offlineResult.is_valid) {
                setDenialReason(offlineResult.denial_reason || 'Access denied');
                setState('denied');
                return;
            }

            setState('error');
        }
    };

    // -----------------------------------------------------------------------
    // RENDER STATES
    // -----------------------------------------------------------------------

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-sm w-full text-center space-y-6">

                {/* LOADING */}
                {state === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                        <div>
                            <h2 className="text-xl font-semibold">Validating QR Code</h2>
                            <p className="text-gray-500 text-sm mt-1">Please wait...</p>
                        </div>
                    </div>
                )}

                {/* REDIRECTING */}
                {state === 'redirecting' && (
                    <div className="space-y-4">
                        <ShieldCheck className="h-12 w-12 text-green-600 mx-auto" />
                        <div>
                            <h2 className="text-xl font-semibold text-green-700">Access Granted</h2>
                            <p className="text-gray-500 text-sm mt-1">Redirecting to machine passport...</p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-green-600 mx-auto" />
                    </div>
                )}

                {/* OFFLINE SUCCESS */}
                {state === 'offline_success' && (
                    <div className="space-y-4">
                        <div className="flex justify-center gap-2">
                            <ShieldCheck className="h-10 w-10 text-green-600" />
                            <WifiOff className="h-8 w-8 text-orange-500 mt-1" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Offline Access Granted</h2>
                            <p className="text-gray-500 text-sm mt-1">
                                Using cached credentials. Data may not be up to date.
                            </p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-green-600 mx-auto" />
                    </div>
                )}

                {/* DENIED */}
                {state === 'denied' && (
                    <div className="space-y-4">
                        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
                        <div>
                            <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
                            <p className="text-gray-500 text-sm mt-1 capitalize">
                                {denialReason.replace(/_/g, ' ')}
                            </p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left text-sm">
                            {denialReason === 'expired' && (
                                <p>This QR code has expired. Please contact the site administrator for a new one.</p>
                            )}
                            {denialReason === 'revoked' && (
                                <p>This QR code has been revoked. Contact the site administrator.</p>
                            )}
                            {denialReason === 'max_scans_exceeded' && (
                                <p>This QR code has reached its maximum number of uses.</p>
                            )}
                            {!['expired', 'revoked', 'max_scans_exceeded'].includes(denialReason) && (
                                <p>You do not have permission to access this machine. Contact your supervisor.</p>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            Go to Dashboard
                        </Button>
                    </div>
                )}

                {/* ERROR */}
                {state === 'error' && (
                    <div className="space-y-4">
                        {isOffline ? (
                            <WifiOff className="h-12 w-12 text-orange-500 mx-auto" />
                        ) : (
                            <ShieldAlert className="h-12 w-12 text-gray-400 mx-auto" />
                        )}
                        <div>
                            <h2 className="text-xl font-semibold">
                                {isOffline ? 'No Offline Data' : 'Something Went Wrong'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {isOffline
                                    ? 'You are offline and this QR code has not been cached. Connect to the internet and try again.'
                                    : 'Unable to validate this QR code. Please try again.'
                                }
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => router.push('/')}>
                                Dashboard
                            </Button>
                            <Button onClick={() => { setState('loading'); handleScan(token as string); }}>
                                Retry
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

