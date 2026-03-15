import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

export type AuthenticatorLevel = "aal1" | "aal2" | null;

export interface MfaFactorRow {
    id: string;
    friendly_name: string | null;
    factor_type: string | null;
    status: string | null;
    created_at: string | null;
}

export interface MfaFactor {
    id: string;
    friendlyName: string | null;
    type: string | null;
    status: string | null;
    createdAt: string | null;
}

export interface MfaStatus {
    currentLevel: AuthenticatorLevel;
    nextLevel: AuthenticatorLevel;
    hasMfaEnabled: boolean;
    needsMfaVerification: boolean;
    factors: MfaFactor[];
}

export interface MfaEnrollResult {
    factorId: string;
    secret: string;
    uri: string;
    qrCode: string;
}

function mapFactorRow(factor: any): MfaFactorRow {
    return {
        id: factor?.id,
        friendly_name: factor?.friendly_name ?? null,
        factor_type: factor?.factor_type ?? null,
        status: factor?.status ?? null,
        created_at: factor?.created_at ?? null,
    };
}

function mapFactor(factor: MfaFactorRow): MfaFactor {
    return {
        id: factor.id,
        friendlyName: factor.friendly_name,
        type: factor.factor_type,
        status: factor.status,
        createdAt: factor.created_at,
    };
}

export async function listMfaFactors(): Promise<MfaFactorRow[]> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    return (data?.all ?? []).map(mapFactorRow);
}

export async function getMfaStatus(): Promise<MfaStatus> {
    const [{ data: assurance, error: assuranceError }, factors] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        listMfaFactors(),
    ]);

    if (assuranceError) throw assuranceError;

    const mappedFactors = factors.map(mapFactor);
    const verifiedFactors = mappedFactors.filter((factor) => factor.status === "verified");
    const hasMfaEnabled = verifiedFactors.length > 0;

    const currentLevel = (assurance?.currentLevel as AuthenticatorLevel) ?? null;
    const nextLevel = (assurance?.nextLevel as AuthenticatorLevel) ?? null;
    const needsMfaVerification = hasMfaEnabled && currentLevel !== "aal2" && nextLevel === "aal2";

    return {
        currentLevel,
        nextLevel,
        hasMfaEnabled,
        needsMfaVerification,
        factors: mappedFactors,
    };
}

export async function enrollTotpFactor(friendlyName?: string): Promise<MfaEnrollResult> {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: friendlyName?.trim() || undefined,
    });

    if (error) throw error;

    const secret = data?.totp?.secret ?? "";
    const uri = data?.totp?.uri ?? "";
    const qrCode = uri ? await QRCode.toDataURL(uri) : "";

    return {
        factorId: data.id,
        secret,
        uri,
        qrCode,
    };
}

export async function challengeFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
}

export async function verifyFactor(params: { factorId: string; challengeId: string; code: string }) {
    const { factorId, challengeId, code } = params;

    const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
    });

    if (error) throw error;
    return data;
}

export async function verifyEnrollment(factorId: string, code: string): Promise<boolean> {
    const challenge = await challengeFactor(factorId);
    await verifyFactor({
        factorId,
        challengeId: challenge.id,
        code,
    });
    return true;
}

export async function unenrollFactor(factorId: string): Promise<boolean> {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return true;
}

export async function challengeAndVerify(code: string): Promise<boolean> {
    const status = await getMfaStatus();
    const factor = status.factors.find((item) => item.status === "verified" && item.type === "totp");

    if (!factor?.id) {
        throw new Error("Nessun fattore TOTP verificato disponibile.");
    }

    const challenge = await challengeFactor(factor.id);
    await verifyFactor({
        factorId: factor.id,
        challengeId: challenge.id,
        code,
    });

    return true;
}

export async function needsVerification(): Promise<boolean> {
    const status = await getMfaStatus();
    return status.needsMfaVerification;
}

export const mfaService = {
    listFactors: listMfaFactors,
    getStatus: getMfaStatus,
    enrollTOTP: enrollTotpFactor,
    verifyEnrollment,
    challengeAndVerify,
    unenrollFactor,
    needsVerification,
};
