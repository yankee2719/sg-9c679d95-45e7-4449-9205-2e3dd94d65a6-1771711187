// src/services/mfaService.ts
// ============================================================================
// MFA SERVICE — Supabase Native TOTP Multi-Factor Authentication
// ============================================================================
// Uses supabase.auth.mfa.* APIs — NO custom tables needed.
// Supabase manages factors, challenges, and verification internally.
//
// Flow:
//   1. ENROLL:  mfa.enroll() → QR code → user scans → mfa.verify() → factor active
//   2. LOGIN:   sign in → check AAL → if aal2 needed → mfa.challenge() → mfa.verify()
//   3. UNENROLL: mfa.unenroll() → factor removed
//
// AAL Levels:
//   - aal1: standard login (email+password, OAuth, magic link)
//   - aal2: login + verified MFA factor
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface MfaFactor {
    id: string;
    friendlyName: string | null;
    type: 'totp' | 'phone';
    status: 'verified' | 'unverified';
    createdAt: string;
    updatedAt: string;
}

export interface MfaEnrollResult {
    factorId: string;
    qrCode: string;       // SVG data URL for QR code
    secret: string;        // Manual entry secret
    uri: string;           // otpauth:// URI
}

export interface MfaStatus {
    currentLevel: 'aal1' | 'aal2' | null;
    nextLevel: 'aal1' | 'aal2' | null;
    needsMfaVerification: boolean;
    hasMfaEnabled: boolean;
    factors: MfaFactor[];
}

// ============================================================================
// SERVICE
// ============================================================================

export const mfaService = {

    // ─── STATUS ──────────────────────────────────────────────────────────

    /**
     * Get current MFA status for the authenticated user.
     * Call this after login to determine if MFA verification is needed.
     */
    async getStatus(): Promise<MfaStatus> {
        try {
            // Get AAL levels
            const { data: aalData, error: aalError } =
                await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (aalError) throw aalError;

            // Get enrolled factors
            const { data: factorsData, error: factorsError } =
                await supabase.auth.mfa.listFactors();

            if (factorsError) throw factorsError;

            const verifiedFactors = [
                ...(factorsData.totp || []),
                ...(factorsData.phone || []),
            ].filter(f => f.status === 'verified');

            const allFactors: MfaFactor[] = [
                ...(factorsData.totp || []),
                ...(factorsData.phone || []),
            ].map(f => ({
                id: f.id,
                friendlyName: f.friendly_name || null,
                type: f.factor_type as 'totp' | 'phone',
                status: f.status as 'verified' | 'unverified',
                createdAt: f.created_at,
                updatedAt: f.updated_at,
            }));

            return {
                currentLevel: aalData.currentLevel as 'aal1' | 'aal2' | null,
                nextLevel: aalData.nextLevel as 'aal1' | 'aal2' | null,
                needsMfaVerification:
                    aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2',
                hasMfaEnabled: verifiedFactors.length > 0,
                factors: allFactors,
            };
        } catch (error) {
            console.error('Error getting MFA status:', error);
            return {
                currentLevel: null,
                nextLevel: null,
                needsMfaVerification: false,
                hasMfaEnabled: false,
                factors: [],
            };
        }
    },

    // ─── ENROLL ──────────────────────────────────────────────────────────

    /**
     * Start enrolling a new TOTP factor.
     * Returns QR code and secret for the user to scan/enter in their authenticator app.
     * After scanning, user must call verifyEnrollment() with the code from their app.
     */
    async enrollTOTP(friendlyName?: string): Promise<MfaEnrollResult | null> {
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: friendlyName || 'MACHINA Authenticator',
                issuer: 'MACHINA',
            });

            if (error) throw error;

            return {
                factorId: data.id,
                qrCode: data.totp.qr_code,
                secret: data.totp.secret,
                uri: data.totp.uri,
            };
        } catch (error) {
            console.error('Error enrolling TOTP factor:', error);
            return null;
        }
    },

    /**
     * Verify enrollment by providing the code from the authenticator app.
     * This activates the factor — after this, MFA will be required on login.
     */
    async verifyEnrollment(factorId: string, code: string): Promise<boolean> {
        try {
            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId });

            if (challengeError) throw challengeError;

            const { data, error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code,
            });

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error verifying enrollment:', error);
            return false;
        }
    },

    // ─── CHALLENGE & VERIFY (login flow) ─────────────────────────────────

    /**
     * Challenge and verify in one step (for login flow).
     * Call this when getStatus() returns needsMfaVerification = true.
     */
    async challengeAndVerify(code: string): Promise<boolean> {
        try {
            // Get the verified TOTP factor
            const { data: factorsData, error: factorsError } =
                await supabase.auth.mfa.listFactors();

            if (factorsError) throw factorsError;

            const totpFactor = (factorsData.totp || []).find(f => f.status === 'verified');
            if (!totpFactor) {
                throw new Error('No verified TOTP factor found');
            }

            // Challenge + verify in one call
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId: totpFactor.id,
                code,
            });

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error verifying MFA challenge:', error);
            return false;
        }
    },

    /**
     * Challenge and verify a specific factor (when user has multiple factors).
     */
    async verifyFactor(factorId: string, code: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code,
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error verifying factor:', error);
            return false;
        }
    },

    // ─── UNENROLL ────────────────────────────────────────────────────────

    /**
     * Remove a MFA factor. User must be at aal2 level to unenroll.
     * If this is the last factor, MFA will be disabled for the user.
     */
    async unenrollFactor(factorId: string): Promise<boolean> {
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error unenrolling factor:', error);
            return false;
        }
    },

    // ─── HELPERS ─────────────────────────────────────────────────────────

    /**
     * Quick check: does the current user need MFA verification right now?
     */
    async needsVerification(): Promise<boolean> {
        const status = await this.getStatus();
        return status.needsMfaVerification;
    },

    /**
     * Quick check: is MFA enabled for the current user?
     */
    async isEnabled(): Promise<boolean> {
        const status = await this.getStatus();
        return status.hasMfaEnabled;
    },

    /**
     * Get the count of verified factors (for settings UI).
     */
    async getVerifiedFactorCount(): Promise<number> {
        const status = await this.getStatus();
        return status.factors.filter(f => f.status === 'verified').length;
    },
};