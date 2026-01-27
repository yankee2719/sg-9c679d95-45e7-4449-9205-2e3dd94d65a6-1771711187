import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { twoFactorService } from "@/services/twoFactorService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, Loader2, Shield } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [userId, setUserId] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Ensure user profile exists (create if missing)
        await authService.ensureProfile(data.user.id, data.user.email || "");
        
        // Check if user has 2FA enabled
        const twoFASettings = await twoFactorService.get2FASettings(data.user.id);
        
        if (twoFASettings?.is_enabled) {
          setNeeds2FA(true);
          setUserId(data.user.id);
          setLoading(false);
          return;
        }

        // No 2FA, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Errore durante il login");
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const twoFASettings = await twoFactorService.get2FASettings(userId);
      
      if (!twoFASettings) {
        throw new Error("Configurazione 2FA non trovata");
      }

      // Verify TOTP code
      const isValid = twoFactorService.verifyTOTP(twoFASettings.secret, totpCode);
      
      if (!isValid) {
        // Try backup code
        const isBackupValid = await twoFactorService.verifyBackupCode(userId, totpCode);
        if (!isBackupValid) {
          throw new Error("Codice non valido");
        }
      }

      // 2FA verified, redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Codice di verifica non valido");
      setLoading(false);
    }
  };

  if (needs2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifica 2FA</CardTitle>
            <CardDescription>
              Inserisci il codice a 6 cifre dall'app Google Authenticator o un codice di backup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify2FA} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="totp">Codice di verifica</Label>
                <Input
                  id="totp"
                  type="text"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={8}
                  className="text-center text-2xl tracking-widest"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  "Verifica"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setNeeds2FA(false);
                  setTotpCode("");
                }}
              >
                Torna al login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Industrial Maintenance</CardTitle>
          <CardDescription>
            Accedi al sistema di gestione manutenzioni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@azienda.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                "Accedi"
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t mt-4">
            <Link 
              href="/register" 
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Non hai un account? <span className="font-semibold">Registrati</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}