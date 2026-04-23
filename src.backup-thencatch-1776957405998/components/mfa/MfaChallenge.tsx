// src/components/mfa/MfaChallenge.tsx
// ============================================================================
// MFA CHALLENGE COMPONENT — Shown during login when 2FA verification needed
// ============================================================================
// This component intercepts the login flow when:
//   currentLevel = aal1 AND nextLevel = aal2
// The user must enter their TOTP code to proceed to the app.
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { useMfa } from '@/hooks/useMfa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MfaChallengeProps {
    onVerified: () => void;
    onCancel?: () => void;
}

export function MfaChallenge({ onVerified, onCancel }: MfaChallengeProps) {
    const { verify, verifying, error, status } = useMfa();
    const [code, setCode] = useState('');
    const [attempts, setAttempts] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleVerify = async () => {
        if (code.length !== 6) return;

        const success = await verify(code);
        if (success) {
            onVerified();
        } else {
            setAttempts(prev => prev + 1);
            setCode('');
            inputRef.current?.focus();
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        onCancel?.();
    };

    // Show multiple factors if user has more than one
    const verifiedFactors = status?.factors.filter(f => f.status === 'verified') || [];
    const hasMultipleFactors = verifiedFactors.length > 1;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-primary/10 p-4">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle>Verifica in Due Passaggi</CardTitle>
                    <CardDescription>
                        Inserisci il codice a 6 cifre dalla tua app di autenticazione
                        {hasMultipleFactors && (
                            <span className="block mt-1 text-xs">
                                ({verifiedFactors[0]?.friendlyName || 'Authenticator App'})
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Code input */}
                    <div className="space-y-2">
                        <Input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                            autoComplete="one-time-code"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && code.length === 6) {
                                    handleVerify();
                                }
                            }}
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <p className="text-sm text-destructive text-center">
                            {error}
                            {attempts >= 3 && (
                                <span className="block mt-1 text-xs">
                                    Se hai perso accesso alla tua app, contatta l'amministratore.
                                </span>
                            )}
                        </p>
                    )}

                    {/* Verify button */}
                    <Button
                        onClick={handleVerify}
                        disabled={code.length !== 6 || verifying}
                        className="w-full h-11"
                    >
                        {verifying ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifica in corso...
                            </>
                        ) : (
                            'Verifica'
                        )}
                    </Button>

                    {/* Sign out option */}
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                            className="text-muted-foreground"
                        >
                            <LogOut className="h-3 w-3 mr-1" />
                            Esci e accedi con un altro account
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}