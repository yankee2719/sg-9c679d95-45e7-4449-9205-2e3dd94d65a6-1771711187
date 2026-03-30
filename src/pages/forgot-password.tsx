import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
    ArrowLeft,
    CheckCircle2,
    Factory,
    Loader2,
    Mail,
    QrCode,
    Shield,
    Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        seoTitle: "Password dimenticata - MACHINA",
        seoDescription: "Recupera l'accesso al tuo account MACHINA.",
        kicker: "Recupero accesso",
        title: "Ripristina l'accesso a MACHINA",
        subtitle: "Inserisci la tua email aziendale. Ti invieremo un link per impostare una nuova password e rientrare nel flusso operativo.",
        emailLabel: "Email aziendale",
        emailPlaceholder: "nome.cognome@azienda.it",
        sendButton: "Invia link di reset",
        sending: "Invio in corso...",
        backToLogin: "Torna al login",
        remembered: "Ti sei ricordato la password?",
        loginLink: "Accedi",
        genericError: "Errore durante l'invio dell'email",
        sentTitle: "Email inviata",
        sentSubtitle: "Abbiamo inviato il link di reset a:",
        sentHelp: "Controlla la casella di posta e segui il link. Per motivi di sicurezza il collegamento resta valido per 1 ora.",
        panelTitle: "Continuità operativa anche nel recupero account",
        panelBody: "Il recupero credenziali resta coerente con l'identità MACHINA: accesso rapido, contesto industriale e sicurezza chiara per operatori, supervisori e costruttori.",
        bullet1: "Accesso rapido a macchina, documenti e checklist",
        bullet2: "Sicurezza pronta per MFA e ruoli industriali",
        bullet3: "Stesso linguaggio visivo di landing, login e registrazione",
        security: "Link valido per 1 ora",
    },
    en: {
        seoTitle: "Forgot password - MACHINA",
        seoDescription: "Recover access to your MACHINA account.",
        kicker: "Access recovery",
        title: "Restore access to MACHINA",
        subtitle: "Enter your business email. We will send you a secure link to set a new password and return to your operational workspace.",
        emailLabel: "Business email",
        emailPlaceholder: "name.surname@company.com",
        sendButton: "Send reset link",
        sending: "Sending...",
        backToLogin: "Back to login",
        remembered: "Remembered your password?",
        loginLink: "Sign in",
        genericError: "Error while sending the email",
        sentTitle: "Email sent",
        sentSubtitle: "We sent a reset link to:",
        sentHelp: "Check your inbox and follow the link. For security reasons the link remains valid for 1 hour.",
        panelTitle: "Operational continuity even during account recovery",
        panelBody: "Credential recovery stays aligned with MACHINA: fast access, industrial context, and clear security for operators, supervisors, and manufacturers.",
        bullet1: "Fast path back to machines, documents, and checklists",
        bullet2: "Security ready for MFA and industrial roles",
        bullet3: "Same visual language as landing, login, and registration",
        security: "Link valid for 1 hour",
    },
    fr: {
        seoTitle: "Mot de passe oublié - MACHINA",
        seoDescription: "Récupérez l'accès à votre compte MACHINA.",
        kicker: "Récupération d'accès",
        title: "Restaurez l'accès à MACHINA",
        subtitle: "Saisissez votre email professionnel. Nous vous enverrons un lien sécurisé pour définir un nouveau mot de passe et revenir dans votre environnement opérationnel.",
        emailLabel: "Email professionnel",
        emailPlaceholder: "nom.prenom@entreprise.fr",
        sendButton: "Envoyer le lien de réinitialisation",
        sending: "Envoi en cours...",
        backToLogin: "Retour à la connexion",
        remembered: "Vous vous souvenez du mot de passe ?",
        loginLink: "Se connecter",
        genericError: "Erreur lors de l'envoi de l'email",
        sentTitle: "Email envoyé",
        sentSubtitle: "Nous avons envoyé un lien de réinitialisation à :",
        sentHelp: "Vérifiez votre boîte mail et suivez le lien. Pour des raisons de sécurité, le lien reste valable 1 heure.",
        panelTitle: "Continuité opérationnelle même pendant la récupération",
        panelBody: "La récupération des identifiants reste alignée avec MACHINA : accès rapide, contexte industriel et sécurité claire pour opérateurs, superviseurs et constructeurs.",
        bullet1: "Retour rapide vers machines, documents et check-lists",
        bullet2: "Sécurité prête pour MFA et rôles industriels",
        bullet3: "Même langage visuel que la landing, la connexion et l'inscription",
        security: "Lien valable 1 heure",
    },
    es: {
        seoTitle: "Olvidé mi contraseña - MACHINA",
        seoDescription: "Recupera el acceso a tu cuenta MACHINA.",
        kicker: "Recuperación de acceso",
        title: "Restablece el acceso a MACHINA",
        subtitle: "Introduce tu correo corporativo. Te enviaremos un enlace seguro para definir una nueva contraseña y volver al entorno operativo.",
        emailLabel: "Email corporativo",
        emailPlaceholder: "nombre.apellido@empresa.es",
        sendButton: "Enviar enlace de restablecimiento",
        sending: "Enviando...",
        backToLogin: "Volver al acceso",
        remembered: "¿Recordaste tu contraseña?",
        loginLink: "Inicia sesión",
        genericError: "Error al enviar el correo",
        sentTitle: "Correo enviado",
        sentSubtitle: "Hemos enviado el enlace de restablecimiento a:",
        sentHelp: "Revisa tu bandeja de entrada y sigue el enlace. Por seguridad, el enlace seguirá siendo válido durante 1 hora.",
        panelTitle: "Continuidad operativa también durante la recuperación",
        panelBody: "La recuperación de credenciales mantiene la identidad MACHINA: acceso rápido, contexto industrial y seguridad clara para operadores, supervisores y fabricantes.",
        bullet1: "Regreso rápido a máquinas, documentos y checklists",
        bullet2: "Seguridad preparada para MFA y roles industriales",
        bullet3: "Mismo lenguaje visual que landing, acceso y registro",
        security: "Enlace válido durante 1 hora",
    },
} as const;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) throw resetError;
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : text.genericError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <SEO title={text.seoTitle} description={text.seoDescription} />
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
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{text.security}</div>
                                        <div className="text-slate-400">Password reset stays inside the same secure MACHINA access flow.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex items-center justify-center p-4 sm:p-6 lg:p-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_28%)] lg:hidden" />
                        <div className="relative w-full max-w-md">
                            <div className="mb-6 flex items-center justify-between lg:hidden">
                                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                                    <ArrowLeft className="h-4 w-4" />
                                    {text.backToLogin}
                                </Link>
                                <div className="text-xs font-semibold tracking-[0.18em] text-orange-400">MACHINA</div>
                            </div>

                            <Card className="w-full rounded-[2rem] border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/30">
                                <CardHeader className="space-y-4 text-center">
                                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${success ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-300"}`}>
                                        {success ? <CheckCircle2 className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
                                    </div>
                                    <div className="space-y-2">
                                        <CardTitle className="text-2xl font-bold text-white">{success ? text.sentTitle : text.title}</CardTitle>
                                        <CardDescription className="text-slate-400">{success ? text.sentHelp : text.subtitle}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {success ? (
                                        <div className="space-y-6">
                                            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-center">
                                                <div className="mb-2 text-sm text-slate-400">{text.sentSubtitle}</div>
                                                <div className="break-all font-semibold text-white">{email}</div>
                                            </div>

                                            <Alert className="border-blue-500/30 bg-blue-500/10 text-blue-50">
                                                <Mail className="h-4 w-4" />
                                                <AlertDescription>{text.sentHelp}</AlertDescription>
                                            </Alert>

                                            <Button onClick={() => router.push("/login")} className="w-full bg-orange-600 text-white hover:bg-orange-500">
                                                {text.backToLogin}
                                            </Button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            {error ? (
                                                <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-100">
                                                    <AlertDescription>{error}</AlertDescription>
                                                </Alert>
                                            ) : null}

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-slate-200">{text.emailLabel}</Label>
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

                                            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400">
                                                <Wrench className="h-4 w-4 text-orange-300" />
                                                <span>{text.security}</span>
                                            </div>

                                            <Button type="submit" className="w-full bg-orange-600 text-white hover:bg-orange-500" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        {text.sending}
                                                    </>
                                                ) : (
                                                    text.sendButton
                                                )}
                                            </Button>

                                            <div className="text-center text-sm text-slate-400">
                                                {text.remembered}{" "}
                                                <Link href="/login" className="font-medium text-orange-300 hover:text-orange-200">
                                                    {text.loginLink}
                                                </Link>
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

