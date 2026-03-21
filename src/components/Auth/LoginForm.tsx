import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { Loader2, Shield, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMfaStatus } from "@/services/mfaService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = {
    it: {
        title: "Accesso a MACHINA",
        subtitle: "Accedi alla piattaforma per documentazione, manutenzioni e compliance.",
        email: "Email",
        password: "Password",
        emailPlaceholder: "nome@azienda.com",
        forgotPassword: "Password dimenticata?",
        submit: "Accedi",
        loading: "Accesso in corso...",
        noAccount: "Non hai un account?",
        register: "Registrati",
        invalidCredentials: "Email o password non corretti.",
        genericError: "Errore durante il login",
    },
    en: {
        title: "Sign in to MACHINA",
        subtitle: "Access the platform for documentation, maintenance, and compliance.",
        email: "Email",
        password: "Password",
        emailPlaceholder: "name@company.com",
        forgotPassword: "Forgot password?",
        submit: "Sign in",
        loading: "Signing in...",
        noAccount: "No account yet?",
        register: "Register",
        invalidCredentials: "Incorrect email or password.",
        genericError: "Login error",
    },
    fr: {
        title: "Connexion à MACHINA",
        subtitle: "Accédez à la plateforme pour la documentation, la maintenance et la conformité.",
        email: "Email",
        password: "Mot de passe",
        emailPlaceholder: "nom@entreprise.com",
        forgotPassword: "Mot de passe oublié ?",
        submit: "Se connecter",
        loading: "Connexion en cours...",
        noAccount: "Pas encore de compte ?",
        register: "S’inscrire",
        invalidCredentials: "Email ou mot de passe incorrect.",
        genericError: "Erreur de connexion",
    },
    es: {
        title: "Acceso a MACHINA",
        subtitle: "Accede a la plataforma de documentación, mantenimiento y compliance.",
        email: "Email",
        password: "Contraseña",
        emailPlaceholder: "nombre@empresa.com",
        forgotPassword: "¿Has olvidado la contraseña?",
        submit: "Entrar",
        loading: "Acceso en curso...",
        noAccount: "¿Aún no tienes cuenta?",
        register: "Regístrate",
        invalidCredentials: "Email o contraseña incorrectos.",
        genericError: "Error durante el acceso",
    },
} as const;

export function LoginForm() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();

        if (loading) return;

        setError("");
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                const msg = String(signInError.message || "").toLowerCase();
                if (
                    msg.includes("invalid login credentials") ||
                    msg.includes("email not confirmed") ||
                    msg.includes("invalid")
                ) {
                    setError(text.invalidCredentials);
                } else {
                    setError(signInError.message || text.genericError);
                }
                return;
            }

            if (!data.user) {
                setError(text.genericError);
                return;
            }

            const status = await getMfaStatus().catch(() => null);

            if (status?.needsMfaVerification) {
                await router.replace("/settings/security");
                return;
            }

            await router.replace("/dashboard");
        } catch (err: any) {
            console.error(err);
            setError(err?.message || text.genericError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                        <Wrench className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{text.title}</CardTitle>
                    <CardDescription>{text.subtitle}</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {!!error && !loading && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">{text.email}</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={text.emailPlaceholder}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{text.password}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Shield className="h-3.5 w-3.5" />
                                MFA ready
                            </div>

                            <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {text.forgotPassword}
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {text.loading}
                                </>
                            ) : (
                                text.submit
                            )}
                        </Button>
                    </form>

                    <div className="text-center pt-4 border-t mt-4 text-sm">
                        {text.noAccount}{" "}
                        <Link
                            href="/register"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                        >
                            {text.register}
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}