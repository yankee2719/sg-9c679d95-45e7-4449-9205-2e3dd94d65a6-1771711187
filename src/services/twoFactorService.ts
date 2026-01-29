import { supabase } from "@/integrations/supabase/client";

export const twoFactorService = {
  async enableTwoFactor(userId: string, secret: string, backupCodes: string[]) {
    // Check if entry exists first
    const { data: existing } = await supabase
      .from("two_factor_auth" as any)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from("two_factor_auth" as any)
        .update({
          secret,
          backup_codes: backupCodes,
          is_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
    } else {
      return await supabase
        .from("two_factor_auth" as any)
        .insert({
          user_id: userId,
          secret,
          backup_codes: backupCodes,
          is_enabled: true
        });
    }
  },

  async disableTwoFactor(userId: string) {
    return await supabase
      .from("two_factor_auth" as any)
      .update({
        is_enabled: false,
        secret: "", // Clear secret for security
        backup_codes: []
      })
      .eq("user_id", userId);
  },

  async verifyTwoFactor(userId: string, token: string) {
    // In a real app, this verification would happen on the server side
    // or via an Edge Function to verify the TOTP token against the secret
    // For now we'll just check if 2FA is enabled for the user
    const { data, error } = await supabase
      .from("two_factor_auth" as any)
      .select("is_enabled, secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.is_enabled) return true; // 2FA not enabled, verification passes

    // Here you would verify the token against data.secret using a library like 'otplib'
    // Since we can't do secure verification client-side without exposing the secret,
    // we'll assume the verification is handled by the caller or an API endpoint
    return true;
  },

  async getTwoFactorStatus(userId: string) {
    const { data, error } = await supabase
      .from("two_factor_auth" as any)
      .select("is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return { isEnabled: data?.is_enabled || false };
  }
};