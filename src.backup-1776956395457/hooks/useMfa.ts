import { useCallback, useEffect, useState } from "react";
import { mfaService, type MfaEnrollResult, type MfaStatus } from "@/services/mfaService";

export interface UseMfaReturn {
    status: MfaStatus | null;
    loading: boolean;
    error: string | null;
    isEnabled: boolean;
    needsVerification: boolean;
    factorCount: number;
    enrolling: boolean;
    enrollData: MfaEnrollResult | null;
    startEnrollment: (friendlyName?: string) => Promise<void>;
    confirmEnrollment: (code: string) => Promise<boolean>;
    cancelEnrollment: () => void;
    verifying: boolean;
    verify: (code: string) => Promise<boolean>;
    unenroll: (factorId: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

export function useMfa(): UseMfaReturn {
    const [status, setStatus] = useState < MfaStatus | null > (null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);
    const [enrolling, setEnrolling] = useState(false);
    const [enrollData, setEnrollData] = useState < MfaEnrollResult | null > (null);
    const [verifying, setVerifying] = useState(false);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const nextStatus = await mfaService.getStatus();
            setStatus(nextStatus);
        } catch (err: any) {
            setError(err?.message || "Errore nel caricamento stato MFA");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const startEnrollment = useCallback(async (friendlyName?: string) => {
        try {
            setEnrolling(true);
            setError(null);
            const result = await mfaService.enrollTOTP(friendlyName);
            setEnrollData(result);
        } catch (err: any) {
            setError(err?.message || "Impossibile avviare la configurazione MFA");
            setEnrolling(false);
        }
    }, []);

    const confirmEnrollment = useCallback(
        async (code: string): Promise<boolean> => {
            if (!enrollData) return false;

            try {
                setError(null);
                await mfaService.verifyEnrollment(enrollData.factorId, code);
                setEnrollData(null);
                setEnrolling(false);
                await refresh();
                return true;
            } catch (err: any) {
                setError(err?.message || "Errore nella verifica del codice MFA");
                return false;
            }
        },
        [enrollData, refresh]
    );

    const cancelEnrollment = useCallback(() => {
        setEnrollData(null);
        setEnrolling(false);
        setError(null);
    }, []);

    const verify = useCallback(
        async (code: string): Promise<boolean> => {
            try {
                setVerifying(true);
                setError(null);
                await mfaService.challengeAndVerify(code);
                await refresh();
                return true;
            } catch (err: any) {
                setError(err?.message || "Errore nella verifica MFA");
                return false;
            } finally {
                setVerifying(false);
            }
        },
        [refresh]
    );

    const unenroll = useCallback(
        async (factorId: string): Promise<boolean> => {
            try {
                setError(null);
                await mfaService.unenrollFactor(factorId);
                await refresh();
                return true;
            } catch (err: any) {
                setError(err?.message || "Errore durante la rimozione del fattore MFA");
                return false;
            }
        },
        [refresh]
    );

    const verifiedFactors = status?.factors.filter((factor) => factor.status === "verified") ?? [];

    return {
        status,
        loading,
        error,
        isEnabled: status?.hasMfaEnabled ?? false,
        needsVerification: status?.needsMfaVerification ?? false,
        factorCount: verifiedFactors.length,
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
