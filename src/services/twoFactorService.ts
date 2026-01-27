import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const twoFactorService = {
  // Generate secret for 2FA (Google Authenticator)
  generateSecret() {
    // Generate a random base32 secret
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  },

  // Generate QR code URL for Google Authenticator
  generateQRCodeURL(email: string, secret: string, issuer: string = "Industrial Maintenance") {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    const otpauth = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  },

  // Enable 2FA for user
  async enable2FA(userId: string, secret: string) {
    const { data, error } = await supabase
      .from("two_factor_auth")
      .upsert({
        user_id: userId,
        secret,
        is_enabled: true,
        backup_codes: this.generateBackupCodes()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Disable 2FA for user
  async disable2FA(userId: string) {
    const { error } = await supabase
      .from("two_factor_auth")
      .update({ is_enabled: false })
      .eq("user_id", userId);

    if (error) throw error;
  },

  // Get 2FA settings for user
  async get2FASettings(userId: string) {
    const { data, error } = await supabase
      .from("two_factor_auth")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Verify TOTP code
  verifyTOTP(secret: string, token: string): boolean {
    // Simple TOTP verification (30-second window)
    const time = Math.floor(Date.now() / 1000 / 30);
    const codes = [
      this.generateTOTP(secret, time - 1),
      this.generateTOTP(secret, time),
      this.generateTOTP(secret, time + 1)
    ];
    return codes.includes(token);
  },

  // Generate TOTP code (simplified version)
  generateTOTP(secret: string, time: number): string {
    // This is a simplified version
    // In production, use a proper TOTP library like 'otplib'
    const hash = this.simpleHash(secret + time.toString());
    const code = (hash % 1000000).toString().padStart(6, "0");
    return code;
  },

  // Simple hash function (replace with proper crypto in production)
  simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  },

  // Generate backup codes
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  },

  // Verify backup code
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("two_factor_auth")
      .select("backup_codes")
      .eq("user_id", userId)
      .single();

    if (error || !data) return false;

    const backupCodes = data.backup_codes as string[];
    if (backupCodes.includes(code)) {
      // Remove used backup code
      const updatedCodes = backupCodes.filter(c => c !== code);
      await supabase
        .from("two_factor_auth")
        .update({ backup_codes: updatedCodes })
        .eq("user_id", userId);
      return true;
    }

    return false;
  }
};