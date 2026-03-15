import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        seoTitle: "Password dimenticata - MACHINA",
        seoDescription: "Recupera l'accesso al tuo account MACHINA.",
        sentTitle: "Email inviata",
        sentIntro: "Abbiamo inviato un link per reimpostare la password a:",
        sentHelp: "Controlla la tua casella di posta e clicca sul link per reimpostare la password. Il link è valido per 1 ora.",
        backToLogin: "Torna al login",
        title: "Password dimenticata?",
        subtitle: "Inserisci la tua email e ti invieremo un link per reimpostare la password.",
        emailLabel: "Indirizzo email",
        emailPlaceholder: "nome.cognome@example.com",
        sending: "Invio in corso...",
        sendButton: "Invia link di reset",
        remembered: "Ti sei ricordato della password?",
        loginLink: "Accedi",
        footer: "Il link di reset sarà valido per 1 ora.",
        genericError: "Errore durante l'invio dell'email",
    },
    en: {
        seoTitle: "Forgot password - MACHINA",
        seoDescription: "Recover access to your MACHINA account.",
        sentTitle: "Email sent",
        sentIntro: "We sent a password reset link to:",
        sentHelp: "Check your inbox and click the link to reset your password. The link is valid for 1 hour.",
        backToLogin: "Back to login",
        title: "Forgot your password?",
        subtitle: "Enter your email and we will send you a link to reset your password.",
        emailLabel: "Email address",
        emailPlaceholder: "name.surname@example.com",
        sending: "Sending...",
        sendButton: "Send reset link",
        remembered: "Remembered your password?",
        loginLink: "Sign in",
        footer: "The reset link will remain valid for 1 hour.",
        genericError: "Error while sending the email",
    },
    fr: {
        seoTitle: "Mot de passe oublié - MACHINA",
        seoDescription: "Récupérez l'accès à votre compte MACHINA.",
        sentTitle: "Email envoyé",
        sentIntro: "Nous avons envoyé un lien de réinitialisation à :",
        sentHelp: "Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe. Le lien est valable pendant 1 heure.",
        backToLogin: "Retour à la connexion",
        title: "Mot de passe oublié ?",
        subtitle: "Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.",
        emailLabel: "Adresse email",
        emailPlaceholder: "nom.prenom@example.com",
        sending: "Envoi en cours...",
        sendButton: "Envoyer le lien de réinitialisation",
        remembered: "Vous vous souvenez du mot de passe ?",
        loginLink: "Se connecter",
        footer: "Le lien de réinitialisation restera valable pendant 1 heure.",
        genericError: "Erreur lors de l'envoi de l'email",
    },
    es: {
        seoTitle: "Olvidé mi contraseña - MACHINA",
        seoDescription: "Recupera el acceso a tu cuenta MACHINA.",
        sentTitle: "Correo enviado",
        sentIntro: "Hemos enviado un enlace para restablecer la contraseña a:",
        sentHelp: "Revisa tu bandeja de entrada y haz clic en el enlace para restablecer la contraseña. El enlace es válido durante 1 hora.",
        backToLogin: "Volver al acceso",
        title: "¿Olvidaste tu contraseña?",
        subtitle: "Introduce tu correo y te enviaremos un enlace para restablecer la contraseña.",
        emailLabel: "Correo electrónico",
        emailPlaceholder: "nombre.apellido@example.com",
        sending: "Enviando...",
        sendButton: "Enviar enlace de restablecimiento",
        remembered: "¿Recordaste tu contraseña?",
        loginLink: "Acceder",
        footer: "El enlace de restablecimiento será válido durante 1 hora.",
        genericError: "Error al enviar el correo",
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
            const errorMessage = err instanceof Error ? err.message : text.genericError;
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <>
                <SEO title={text.seoTitle} description={text.seoDescription} />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
                    <div className="w-full max-w-md">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                                {text.sentTitle}
                            </h1>

                            <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                                {text.sentIntro}
                            </p>

                            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-6">
                                <p className="text-center font-semibold text-slate-900 dark:text-white break-all">
                                    {email}
                                </p>
                            </div>

                            <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertDescription className="text-blue-800 dark:text-blue-300">
                                    {text.sentHelp}
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={() => router.push("/login")}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                {text.backToLogin}
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <SEO title={text.seoTitle} description={text.seoDescription} />
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {text.backToLogin}
                        </Link>

                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                            {text.title}
                        </h1>

                        <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
                            {text.subtitle}
                        </p>

                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Label htmlFor="email" className="text-slate-900 dark:text-white">
                                    {text.emailLabel}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={text.emailPlaceholder}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400"
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
                                        {text.sending}
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        {text.sendButton}
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {text.remembered}{" "}
                                <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                    {text.loginLink}
                                </Link>
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                        {text.footer}
                    </p>
                </div>
            </div>
        </>
    );
}
