import { supabase } from "@/integrations/supabase/client";

export interface MfaFactorRow {
    id: string;
    friendly_name?: string | null;
    factor_type?: string | null;
    status?: string | null;
    created_at?: string | null;
}

export async function listMfaFactors(): Promise<MfaFactorRow[]> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    const all = [
        ...(data?.all ?? []),
    ];

    return all.map((factor: any) => ({
        id: factor.id,
        friendly_name: factor.friendly_name ?? null,
        factor_type: factor.factor_type ?? null,
        status: factor.status ?? null,
        created_at: factor.created_at ?? null,
    }));
}

export async function getMfaStatus() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;

    return {
        currentLevel: data?.currentLevel ?? null,
        nextLevel: data?.nextLevel ?? null,
    };
}

export async function enrollTotpFactor(friendlyName?: string) {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: friendlyName?.trim() || undefined,
    });

    if (error) throw error;

    return {
        factorId: data.id,
        secret: data.totp?.secret ?? null,
        uri: data.totp?.uri ?? null,
    };
}

export async function challengeFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({
        factorId,
    });

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

export async function unenrollFactor(factorId: string) {
    const { data, error } = await supabase.auth.mfa.unenroll({
        factorId,
    });

    if (error) throw error;
    return data;
}