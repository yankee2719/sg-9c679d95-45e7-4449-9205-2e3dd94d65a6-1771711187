import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { ArrowLeft, Factory, Loader2, QrCode, Shield, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMfaStatus } from "@/services/mfaService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = {
    it: {
        title: "Accesso a MACHINA",
        subtitle: "Accedi alla piattaforma per documentazione tecnica, manutenzioni, checklist e compliance.",
        email: "Email",
        password: "Password",
        emailPlaceholder: "nome@azienda.com",
        forgotPassword: "Password dimenticata?",
        submit: "Accedi",
        loading: "Accesso in corso...",
        noAccount: "Non hai un account?",
        register: "Registrati",
        genericError: "Errore durante il login",
        mfaNotice: "Credenziali corrette. Completa ora la verifica a due fattori.",
        back: "Torna alla landing",
        kicker: "Piattaforma industriale",
        panelTitle: "Operatività sul campo, non solo ufficio",
        panelBody: "Tecnici, supervisor e costruttori lavorano sullo stesso flusso: macchina, documento, checklist, QR e work order.",
        bullet1: "QR per accesso rapido alla macchina",
        bullet2: "Storico documentale e manutentivo centralizzato",
        bullet3: "Flussi pronti per utilizzo anche offline",
        mfaReady: "MFA pronta",
    },
    en: {
        title: "Sign in to MACHINA",
        subtitle: "Access the platform for technical documents, maintenance, checklists, and compliance.",
        email: "Email",
        password: "Password",
        emailPlaceholder: "name@company.com",
        forgotPassword: "Forgot password?",
        submit: "Sign in",
        loading: "Signing in...",
        noAccount: "No account yet?",
        register: "Register",
        genericError: "Login error",
        mfaNotice: "Credentials accepted. Complete two-factor verification now.",
        back: "Back to landing",
        kicker: "Industrial platform",
        panelTitle: "Built for field operations, not just office work",
        panelBody: "Technicians, supervisors, and manufacturers work on the same flow: machine, document, checklist, QR, and work order.",
        bullet1: "QR-based machine access",
        bullet2: "Centralized document and maintenance history",
        bullet3: "Offline-ready operational flows",
        mfaReady: "MFA ready",
    },
    fr: {
        title: "Connexion à MACHINA",
        subtitle: "Accédez à la plateforme pour les documents techniques, la maintenance, les check-lists et la conformité.",
        email: "Email",
        password: "Mot de passe",
        emailPlaceholder: "nom@entreprise.com",
        forgotPassword: "Mot de passe oublié ?",
        submit: "Se connecter",
        loading: "Connexion en cours...",
        noAccount: "Pas encore de compte ?",
        register: "S’inscrire",
        genericError: "Erreur de connexion",
        mfaNotice: "Identifiants corrects. Terminez maintenant la vérification à deux facteurs.",
        back: "Retour à la landing",
        kicker: "Plateforme industrielle",
        panelTitle: "Pensé pour le terrain, pas seulement pour le bureau",
        panelBody: "Techniciens, superviseurs et constructeurs travaillent sur le même flux : machine, document, check-list, QR et ordre de travail.",
        bullet1: "Accès machine via QR",
        bullet2: "Historique documentaire et maintenance centralisé",
        bullet3: "Flux opérationnels prêts pour l’offline",
        mfaReady: "MFA prête",
    },
    es: {
        title: "Acceso a MACHINA",
        subtitle: "Accede a la plataforma para documentos técnicos, mantenimiento, checklists y compliance.",
        email: "Email",
        password: "Contraseña",
        emailPlaceholder: "nombre@empresa.com",
        forgotPassword: "¿Has olvidado la contraseña?",
        submit: "Entrar",
        loading: "Acceso en curso...",
        noAccount: "¿Aún no tienes cuenta?",
        register: "Regístrate",
        genericError: "Error durante el acceso",
        mfaNotice: "Credenciales correctas. Completa ahora la verificación de dos factores.",
        back: "Volver a la landing",
        kicker: "Plataforma industrial",
        panelTitle: "Pensada para campo, no solo para oficina",
        panelBody: "Técnicos, supervisores y fabricantes trabajan sobre el mismo flujo: máquina, documento, checklist, QR y orden de trabajo.",
        bullet1: "Acceso rápido por QR a la máquina",
        bullet2: "Histórico documental y de mantenimiento centralizado",
        bullet3: "Flujos operativos listos también offline",
        mfaReady: "MFA lista",
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
        setError("");
        setLoading(true);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;

            if (data.user) {
                const status = await getMfaStatus().catch(() => null);
                if (status?.needsMfaVerification) {
                    setError(text.mfaNotice);
                }
                await router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err?.message || text.genericError);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden border-r border-slate-800 bg-slate-950 lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.12),_transparent_28%)]" />
                    <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
                        <div>
                            <Link href="/landing" className="inline-flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                                    <Factory className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold tracking-[0.18em] text-orange-400">MACHINA</div>
                                    <div className="text-xs text-slate-400">Industrial maintenance platform</div>
                                </div>
                            </Link>
                        </div>

                        <div className="max-w-xl">
                            <Badge className="border-orange-500/30 bg-orange-500/10 px-3 py-1 text-orange-300">{text.kicker}</Badge>
                            <h1 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl">{text.panelTitle}</h1>
                            <p className="mt-5 text-lg leading-8 text-slate-300">{text.panelBody}</p>

                            <div className="mt-10 space-y-4">
                                {[text.bullet1, text.bullet2, text.bullet3].map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-300">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                            <QrCode className="h-4 w-4" />
                                        </div>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">QR + documenti + work order</div>
                                    <div className="text-slate-400">Un flusso unico per reparto, assistenza e compliance.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative flex items-center justify-center p-4 sm:p-6 lg:p-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_28%)] lg:hidden" />
                    <div className="relative w-full max-w-md">
                        <div className="mb-6 flex items-center justify-between lg:hidden">
                            <Link href="/landing" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                                <ArrowLeft className="h-4 w-4" />
                                {text.back}
                            </Link>
                            <div className="text-xs font-semibold tracking-[0.18em] text-orange-400">MACHINA</div>
                        </div>

                        <Card className="w-full rounded-[2rem] border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/30">
                            <CardHeader className="space-y-4 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/15 text-orange-300 shadow-lg shadow-orange-950/20">
                                    <Factory className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-2xl font-bold text-white">{text.title}</CardTitle>
                                    <CardDescription className="text-slate-400">{text.subtitle}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    {error ? (
                                        <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-100">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    ) : null}

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-slate-200">{text.email}</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={text.emailPlaceholder}
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            required
                                            className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-slate-200">{text.password}</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            required
                                            className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Shield className="h-3.5 w-3.5" />
                                            {text.mfaReady}
                                        </div>
                                        <Link href="/forgot-password" className="text-sm text-orange-300 hover:text-orange-200">
                                            {text.forgotPassword}
                                        </Link>
                                    </div>

                                    <Button type="submit" className="w-full bg-orange-600 text-white hover:bg-orange-500" disabled={loading}>
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

                                <div className="mt-6 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
                                    {text.noAccount}{" "}
                                    <Link href="/register" className="font-semibold text-orange-300 hover:text-orange-200">
                                        {text.register}
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

