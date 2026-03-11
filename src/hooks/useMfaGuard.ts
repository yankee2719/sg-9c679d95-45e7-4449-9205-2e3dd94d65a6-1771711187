import { supabase } from "@/integrations/supabase/client";

export interface MfaFactorLite {
    id: string;
    friendly_name?: string | null;
    factor_type?: string | null;
    status?: string | null;
    created_at?: string | null;
}

export interface EnrollTotpResult {
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
    friendlyName: string | null;
}

export async function getMfaStatus() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    return data;
}

export async function listMfaFactors(): Promise<MfaFactorLite[]> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    return [
        ...(data?.totp ?? []),
        ...(data?.phone ?? []),
    ].map((factor: any) => ({
        id: factor.id,
        friendly_name: factor.friendly_name ?? null,
        factor_type: factor.factor_type ?? factor.factorType ?? null,
        status: factor.status ?? null,
        created_at: factor.created_at ?? null,
    }));
}

export async function enrollTotpFactor(friendlyName: string): Promise<EnrollTotpResult> {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: friendlyName.trim() || "Authenticator",
    });

    if (error) throw error;

    return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
        friendlyName: data.friendly_name ?? null,
    };
}

export async function challengeFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
}

export async function verifyFactor(params: {
    factorId: string;
    challengeId: string;
    code: string;
}) {
    const { factorId, challengeId, code } = params;

    const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
    });

    if (error) throw error;
    return data;
}

export async function challengeAndVerifyTotp(params: {
    factorId: string;
    code: string;
}) {
    const { factorId, code } = params;

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
    });

    if (error) throw error;
    return data;
}

export async function unenrollFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return data;
}