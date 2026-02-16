// src/hooks/useMfa.ts
// ============================================================================
// MFA HOOK — React hook for MFA state management
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { mfaService, MfaStatus, MfaEnrollResult } from '@/services/mfaService';

export interface UseMfaReturn {
    // Status
    status: MfaStatus | null;
    loading: boolean;
    error: string | null;

    // Computed
    isEnabled: boolean;
    needsVerification: boolean;
    factorCount: number;

    // Enrollment
    enrolling: boolean;
    enrollData: MfaEnrollResult | null;
    startEnrollment: (friendlyName?: string) => Promise<void>;
    confirmEnrollment: (code: string) => Promise<boolean>;
    cancelEnrollment: () => void;

    // Verification (login flow)
    verifying: boolean;
    verify: (code: string) => Promise<boolean>;

    // Management
    unenroll: (factorId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useMfa(): UseMfaReturn {
    const [status, setStatus] = useState < MfaStatus | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);

    // Enrollment state
    const [enrolling, setEnrolling] = useState(false);
    const [enrollData, setEnrollData] = useState < MfaEnrollResult | null > (null);

    // Verification state
    const [verifying, setVerifying] = useState(false);

    // ─── Load status ─────────────────────────────────────────────────────

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const s = await mfaService.getStatus();
            setStatus(s);
        } catch (err: any) {
            setError(err.message || 'Errore nel caricamento stato MFA');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // ─── Enrollment ──────────────────────────────────────────────────────

    const startEnrollment = useCallback(async (friendlyName?: string) => {
        try {
            setEnrolling(true);
            setError(null);
            const result = await mfaService.enrollTOTP(friendlyName);
            if (!result) throw new Error('Impossibile avviare enrollment MFA');
            setEnrollData(result);
        } catch (err: any) {
            setError(err.message);
            setEnrolling(false);
        }
    }, []);

    const confirmEnrollment = useCallback(async (code: string): Promise<boolean> => {
        if (!enrollData) return false;

        try {
            setError(null);
            const success = await mfaService.verifyEnrollment(enrollData.factorId, code);
            if (!success) {
                setError('Codice non valido. Riprova.');
                return false;
            }

            // Cleanup and refresh
            setEnrollData(null);
            setEnrolling(false);
            await refresh();
            return true;
        } catch (err: any) {
            setError(err.message || 'Errore nella verifica del codice');
            return false;
        }
    }, [enrollData, refresh]);

    const cancelEnrollment = useCallback(() => {
        // If we started enrollment but didn't verify, the unverified factor
        // will be cleaned up automatically by Supabase
        setEnrollData(null);
        setEnrolling(false);
        setError(null);
    }, []);

    // ─── Verification (login) ────────────────────────────────────────────

    const verify = useCallback(async (code: string): Promise<boolean> => {
        try {
            setVerifying(true);
            setError(null);
            const success = await mfaService.challengeAndVerify(code);
            if (!success) {
                setError('Codice non valido. Riprova.');
                return false;
            }
            await refresh();
            return true;
        } catch (err: any) {
            setError(err.message || 'Errore nella verifica MFA');
            return false;
        } finally {
            setVerifying(false);
        }
    }, [refresh]);

    // ─── Unenroll ────────────────────────────────────────────────────────

    const unenroll = useCallback(async (factorId: string): Promise<boolean> => {
        try {
            setError(null);
            const success = await mfaService.unenrollFactor(factorId);
            if (!success) {
                setError('Impossibile rimuovere il fattore MFA');
                return false;
            }
            await refresh();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [refresh]);

    // ─── Computed ────────────────────────────────────────────────────────

    const isEnabled = status?.hasMfaEnabled ?? false;
    const needsVerification = status?.needsMfaVerification ?? false;
    const factorCount = status?.factors.filter(f => f.status === 'verified').length ?? 0;

    return {
        status,
        loading,
        error,
        isEnabled,
        needsVerification,
        factorCount,
        enrolling,
        enrollData,
        startEnrollment,
        confirmEnrollment,
        cancelEnrollment,
        verifying,
        verify,
        unenroll,
        refresh,
    };
}