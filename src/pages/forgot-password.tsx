import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Errore durante l'invio dell'email";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <SEO 
          title="Email Inviata - Password Dimenticata"
          description="Email di reset password inviata con successo"
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
                Email Inviata! ✉️
              </h1>
              
              <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                Abbiamo inviato un link per reimpostare la password a:
              </p>

              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-6">
                <p className="text-center font-semibold text-slate-900 dark:text-white break-all">
                  {email}
                </p>
              </div>

              <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  Controlla la tua casella di posta e clicca sul link per reimpostare la password.
                  Il link è valido per 1 ora.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Torna al Login
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
        title="Password Dimenticata - Reset Password"
        description="Recupera l'accesso al tuo account"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <Link 
              href="/login"
              className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Torna al login
            </Link>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
              Password Dimenticata? 🔐
            </h1>
            
            <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
              Inserisci la tua email e ti invieremo un link per reimpostare la password
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Indirizzo Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@azienda.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
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
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Invia Link di Reset
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ti sei ricordato della password?{" "}
                <Link 
                  href="/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Accedi
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Il link di reset sarà valido per 1 ora
          </p>
        </div>
      </div>
    </>
  );
}