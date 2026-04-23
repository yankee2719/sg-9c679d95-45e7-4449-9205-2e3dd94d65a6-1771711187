// src/components/mfa/MfaEnrollment.tsx
// ============================================================================
// MFA ENROLLMENT COMPONENT — For settings page
// ============================================================================
// Shows QR code, allows user to scan and verify with authenticator app.
// Also lists existing factors and allows unenrollment.
// ============================================================================

import { useState } from 'react';
import { useMfa } from '@/hooks/useMfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldX, Trash2, Plus, Loader2 } from 'lucide-react';

export function MfaEnrollment() {
    const {
        status,
        loading,
        error,
        isEnabled,
        factorCount,
        enrolling,
        enrollData,
        startEnrollment,
        confirmEnrollment,
        cancelEnrollment,
        unenroll,
    } = useMfa();

    const [verifyCode, setVerifyCode] = useState('');
    const [friendlyName, setFriendlyName] = useState('');
    const [confirmingUnenroll, setConfirmingUnenroll] = useState<string | null>(null);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    // ─── ENROLLMENT FLOW ─────────────────────────────────────────────────

    if (enrolling && enrollData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Configura Autenticazione a Due Fattori
                    </CardTitle>
                    <CardDescription>
                        Scansiona il QR code con la tua app di autenticazione
                        (Google Authenticator, Authy, 1Password, ecc.)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* QR Code */}
                    <div className="flex justify-center">
                        <div className="rounded-lg border bg-white p-4">
                            <img
                                src={enrollData.qrCode}
                                alt="QR Code per autenticazione"
                                className="h-48 w-48"
                            />
                        </div>
                    </div>

                    {/* Manual entry secret */}
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground text-center">
                            Non riesci a scansionare? Inserisci manualmente questo codice:
                        </p>
                        <div className="flex justify-center">
                            <code className="rounded bg-muted px-3 py-2 text-sm font-mono select-all">
                                {enrollData.secret}
                            </code>
                        </div>
                    </div>

                    {/* Verify code */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium">
                            Inserisci il codice a 6 cifre dalla tua app:
                        </p>
                        <div className="flex gap-3">
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="000000"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-lg tracking-widest font-mono"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && verifyCode.length === 6) {
                                        confirmEnrollment(verifyCode);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                cancelEnrollment();
                                setVerifyCode('');
                            }}
                            className="flex-1"
                        >
                            Annulla
                        </Button>
                        <Button
                            onClick={async () => {
                                const success = await confirmEnrollment(verifyCode);
                                if (success) setVerifyCode('');
                            }}
                            disabled={verifyCode.length !== 6}
                            className="flex-1"
                        >
                            Attiva 2FA
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ─── MAIN VIEW ───────────────────────────────────────────────────────

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isEnabled ? (
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                    ) : (
                        <ShieldX className="h-5 w-5 text-amber-500" />
                    )}
                    Autenticazione a Due Fattori (2FA)
                </CardTitle>
                <CardDescription>
                    {isEnabled
                        ? `${factorCount} fattore${factorCount > 1 ? 'i' : ''} attivo${factorCount > 1 ? 'i' : ''}. Il tuo account è protetto.`
                        : 'Aggiungi un livello di sicurezza extra al tuo account.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Existing factors */}
                {status?.factors.filter(f => f.status === 'verified').map((factor) => (
                    <div
                        key={factor.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                    >
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <div>
                                <p className="text-sm font-medium">
                                    {factor.friendlyName || 'Authenticator App'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {factor.type === 'totp' ? 'TOTP' : 'SMS'} · Aggiunto il{' '}
                                    {new Date(factor.createdAt).toLocaleDateString('it-IT')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-green-700 bg-green-100">
                                Attivo
                            </Badge>
                            {confirmingUnenroll === factor.id ? (
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={async () => {
                                            await unenroll(factor.id);
                                            setConfirmingUnenroll(null);
                                        }}
                                    >
                                        Conferma
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setConfirmingUnenroll(null)}
                                    >
                                        No
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmingUnenroll(factor.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add factor button */}
                {factorCount < 10 && (
                    <div className="pt-2">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground">
                                    Nome (opzionale)
                                </label>
                                <Input
                                    placeholder="es. Google Authenticator, Authy..."
                                    value={friendlyName}
                                    onChange={(e) => setFriendlyName(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    startEnrollment(friendlyName || undefined);
                                    setFriendlyName('');
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {isEnabled ? 'Aggiungi Fattore Backup' : 'Attiva 2FA'}
                            </Button>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                {/* Info note */}
                {!isEnabled && (
                    <p className="text-xs text-muted-foreground pt-2">
                        Consigliamo di aggiungere almeno due fattori: uno principale e uno di backup,
                        nel caso perdessi accesso al primo.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}