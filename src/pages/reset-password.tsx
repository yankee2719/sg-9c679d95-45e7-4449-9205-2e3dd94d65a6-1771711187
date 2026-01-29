import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidToken(true);
      } else {
        setError("Link di reset non valido o scaduto. Richiedi un nuovo link.");
      }
    };

    checkSession();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "La password deve contenere almeno 8 caratteri";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "La password deve contenere almeno una lettera maiuscola";
    }
    if (!/[a-z]/.test(pwd)) {
      return "La password deve contenere almeno una lettera minuscola";
    }
    if (!/[0-9]/.test(pwd)) {
      return "La password deve contenere almeno un numero";
    }
    if (!/[!@#$%^&*]/.test(pwd)) {
      return "La password deve contenere almeno un carattere speciale (!@#$%^&*)";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Errore durante il reset della password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!validToken && error) {
    return (
      <>
        <SEO 
          title="Link Non Valido - Reset Password"
          description="Link di reset password non valido o scaduto"
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                Link Non Valido ⚠️
              </h1>
              
              <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                {error}
              </p>

              <Button
                onClick={() => router.push("/forgot-password")}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Richiedi Nuovo Link
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <SEO 
          title="Password Aggiornata - Reset Password"
          description="Password aggiornata con successo"
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                Password Aggiornata! ✅
              </h1>
              
              <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                La tua password è stata reimpostata con successo.
                Verrai reindirizzato alla pagina di login...
              </p>

              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Vai al Login
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Reimposta Password - Reset Password"
        description="Crea una nuova password per il tuo account"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
              Nuova Password 🔐
            </h1>
            
            <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
              Crea una nuova password sicura per il tuo account
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Nuova Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 8 caratteri"
                  required
                  disabled={loading}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Conferma Nuova Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  required
                  disabled={loading}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Aggiornamento...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Reimposta Password
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}