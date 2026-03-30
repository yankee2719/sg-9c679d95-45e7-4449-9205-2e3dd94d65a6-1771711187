import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    Factory,
    Loader2,
    Lock,
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
        seoTitle: "Reimposta password - MACHINA",
        seoDescription: "Crea una nuova password per il tuo account MACHINA.",
        kicker: "Sicurezza account",
        title: "Imposta una nuova password",
        subtitle: "Completa il recupero accesso con una password sicura e torna nel tuo ambiente MACHINA.",
        passwordLabel: "Nuova password",
        passwordPlaceholder: "Minimo 8 caratteri",
        confirmLabel: "Conferma nuova password",
        confirmPlaceholder: "Ripeti la password",
        updateButton: "Aggiorna password",
        updating: "Aggiornamento in corso...",
        backToLogin: "Torna al login",
        invalidTitle: "Link non valido",
        invalidMessage: "Il link di reset non è valido o è scaduto. Richiedi un nuovo link.",
        invalidAction: "Richiedi nuovo link",
        successTitle: "Password aggiornata",
        successMessage: "La password è stata aggiornata correttamente. Verrai reindirizzato al login.",
        goToLogin: "Vai al login",
        genericError: "Errore durante il reset della password",
        minLength: "La password deve contenere almeno 8 caratteri",
        oneUpper: "La password deve contenere almeno una lettera maiuscola",
        oneLower: "La password deve contenere almeno una lettera minuscola",
        oneNumber: "La password deve contenere almeno un numero",
        oneSpecial: "La password deve contenere almeno un carattere speciale (!@#$%^&*)",
        mismatch: "Le password non coincidono",
        showPassword: "Mostra password",
        hidePassword: "Nascondi password",
        ruleTitle: "Regole minime",
        rule1: "8 caratteri minimi",
        rule2: "1 maiuscola, 1 minuscola, 1 numero",
        rule3: "1 carattere speciale",
        panelTitle: "Reset coerente con il flusso pubblico MACHINA",
        panelBody: "Anche la fase finale di recupero credenziali mantiene lo stesso tono industriale e la stessa chiarezza operativa di landing, login e registrazione.",
        panelBullet1: "Accesso sicuro per ruoli industriali",
        panelBullet2: "Stesso linguaggio visivo pubblico",
        panelBullet3: "Rientro rapido in dashboard, documenti e work order",
    },
    en: {
        seoTitle: "Reset password - MACHINA",
        seoDescription: "Create a new password for your MACHINA account.",
        kicker: "Account security",
        title: "Set a new password",
        subtitle: "Complete access recovery with a secure password and return to your MACHINA workspace.",
        passwordLabel: "New password",
        passwordPlaceholder: "Minimum 8 characters",
        confirmLabel: "Confirm new password",
        confirmPlaceholder: "Repeat password",
        updateButton: "Update password",
        updating: "Updating...",
        backToLogin: "Back to login",
        invalidTitle: "Invalid link",
        invalidMessage: "The reset link is invalid or expired. Request a new one.",
        invalidAction: "Request new link",
        successTitle: "Password updated",
        successMessage: "Your password has been updated successfully. You will be redirected to login.",
        goToLogin: "Go to login",
        genericError: "Error while resetting the password",
        minLength: "Password must be at least 8 characters long",
        oneUpper: "Password must include at least one uppercase letter",
        oneLower: "Password must include at least one lowercase letter",
        oneNumber: "Password must include at least one number",
        oneSpecial: "Password must include at least one special character (!@#$%^&*)",
        mismatch: "Passwords do not match",
        showPassword: "Show password",
        hidePassword: "Hide password",
        ruleTitle: "Minimum rules",
        rule1: "At least 8 characters",
        rule2: "1 uppercase, 1 lowercase, 1 number",
        rule3: "1 special character",
        panelTitle: "Reset aligned with the MACHINA public flow",
        panelBody: "The final step of credential recovery keeps the same industrial tone and operational clarity as landing, login, and registration.",
        panelBullet1: "Secure access for industrial roles",
        panelBullet2: "Same public visual language",
        panelBullet3: "Fast return to dashboards, documents, and work orders",
    },
    fr: {
        seoTitle: "Réinitialiser le mot de passe - MACHINA",
        seoDescription: "Créez un nouveau mot de passe pour votre compte MACHINA.",
        kicker: "Sécurité du compte",
        title: "Définissez un nouveau mot de passe",
        subtitle: "Finalisez la récupération d'accès avec un mot de passe sécurisé et revenez dans votre environnement MACHINA.",
        passwordLabel: "Nouveau mot de passe",
        passwordPlaceholder: "Minimum 8 caractères",
        confirmLabel: "Confirmer le nouveau mot de passe",
        confirmPlaceholder: "Répétez le mot de passe",
        updateButton: "Mettre à jour le mot de passe",
        updating: "Mise à jour en cours...",
        backToLogin: "Retour à la connexion",
        invalidTitle: "Lien invalide",
        invalidMessage: "Le lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.",
        invalidAction: "Demander un nouveau lien",
        successTitle: "Mot de passe mis à jour",
        successMessage: "Votre mot de passe a été mis à jour avec succès. Vous serez redirigé vers la connexion.",
        goToLogin: "Aller à la connexion",
        genericError: "Erreur lors de la réinitialisation du mot de passe",
        minLength: "Le mot de passe doit contenir au moins 8 caractères",
        oneUpper: "Le mot de passe doit contenir au moins une majuscule",
        oneLower: "Le mot de passe doit contenir au moins une minuscule",
        oneNumber: "Le mot de passe doit contenir au moins un chiffre",
        oneSpecial: "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)",
        mismatch: "Les mots de passe ne correspondent pas",
        showPassword: "Afficher le mot de passe",
        hidePassword: "Masquer le mot de passe",
        ruleTitle: "Règles minimales",
        rule1: "8 caractères minimum",
        rule2: "1 majuscule, 1 minuscule, 1 chiffre",
        rule3: "1 caractère spécial",
        panelTitle: "Réinitialisation alignée avec le flux public MACHINA",
        panelBody: "La dernière étape de récupération des identifiants conserve le même ton industriel et la même clarté opérationnelle que la landing, la connexion et l'inscription.",
        panelBullet1: "Accès sécurisé pour les rôles industriels",
        panelBullet2: "Même langage visuel public",
        panelBullet3: "Retour rapide vers tableaux de bord, documents et ordres de travail",
    },
    es: {
        seoTitle: "Restablecer contraseña - MACHINA",
        seoDescription: "Crea una nueva contraseña para tu cuenta MACHINA.",
        kicker: "Seguridad de la cuenta",
        title: "Define una nueva contraseña",
        subtitle: "Completa la recuperación de acceso con una contraseña segura y vuelve a tu entorno MACHINA.",
        passwordLabel: "Nueva contraseña",
        passwordPlaceholder: "Mínimo 8 caracteres",
        confirmLabel: "Confirmar nueva contraseña",
        confirmPlaceholder: "Repite la contraseña",
        updateButton: "Actualizar contraseña",
        updating: "Actualizando...",
        backToLogin: "Volver al acceso",
        invalidTitle: "Enlace no válido",
        invalidMessage: "El enlace de restablecimiento no es válido o ha caducado. Solicita uno nuevo.",
        invalidAction: "Solicitar nuevo enlace",
        successTitle: "Contraseña actualizada",
        successMessage: "Tu contraseña se ha actualizado correctamente. Serás redirigido al acceso.",
        goToLogin: "Ir al acceso",
        genericError: "Error al restablecer la contraseña",
        minLength: "La contraseña debe tener al menos 8 caracteres",
        oneUpper: "La contraseña debe incluir al menos una mayúscula",
        oneLower: "La contraseña debe incluir al menos una minúscula",
        oneNumber: "La contraseña debe incluir al menos un número",
        oneSpecial: "La contraseña debe incluir al menos un carácter especial (!@#$%^&*)",
        mismatch: "Las contraseñas no coinciden",
        showPassword: "Mostrar contraseña",
        hidePassword: "Ocultar contraseña",
        ruleTitle: "Reglas mínimas",
        rule1: "8 caracteres mínimos",
        rule2: "1 mayúscula, 1 minúscula, 1 número",
        rule3: "1 carácter especial",
        panelTitle: "Restablecimiento alineado con el flujo público de MACHINA",
        panelBody: "La fase final de recuperación de credenciales mantiene el mismo tono industrial y la misma claridad operativa que la landing, el acceso y el registro.",
        panelBullet1: "Acceso seguro para roles industriales",
        panelBullet2: "Mismo lenguaje visual público",
        panelBullet3: "Vuelta rápida a dashboards, documentos y órdenes de trabajo",
    },
} as const;

export default function ResetPasswordPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

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
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                setValidToken(true);
            } else {
                setError(text.invalidMessage);
            }
        };

        void checkSession();
    }, [text.invalidMessage]);

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return text.minLength;
        if (!/[A-Z]/.test(pwd)) return text.oneUpper;
        if (!/[a-z]/.test(pwd)) return text.oneLower;
        if (!/[0-9]/.test(pwd)) return text.oneNumber;
        if (!/[!@#$%^&*]/.test(pwd)) return text.oneSpecial;
        return null;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError("");

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError(text.mismatch);
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            window.setTimeout(() => {
                void router.push("/login");
            }, 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : text.genericError);
        } finally {
            setLoading(false);
        }
    };

    const passwordType = showPassword ? "text" : "password";
    const confirmType = showConfirmPassword ? "text" : "password";

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
                                    {[text.panelBullet1, text.panelBullet2, text.panelBullet3].map((item) => (
                                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 text-sm text-slate-300">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
                                                <Wrench className="h-4 w-4" />
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
                                        <div className="font-semibold text-white">{text.ruleTitle}</div>
                                        <div className="text-slate-400">{text.rule1} · {text.rule2} · {text.rule3}</div>
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
                                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${success ? "bg-emerald-500/15 text-emerald-300" : !validToken && error ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-300"}`}>
                                        {success ? <CheckCircle2 className="h-8 w-8" /> : !validToken && error ? <AlertCircle className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
                                    </div>
                                    <div className="space-y-2">
                                        <CardTitle className="text-2xl font-bold text-white">
                                            {success ? text.successTitle : !validToken && error ? text.invalidTitle : text.title}
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">
                                            {success ? text.successMessage : !validToken && error ? text.invalidMessage : text.subtitle}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {!validToken && error ? (
                                        <div className="space-y-4">
                                            <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 text-red-100">
                                                <AlertDescription>{text.invalidMessage}</AlertDescription>
                                            </Alert>
                                            <Button onClick={() => router.push("/forgot-password")} className="w-full bg-orange-600 text-white hover:bg-orange-500">
                                                {text.invalidAction}
                                            </Button>
                                        </div>
                                    ) : success ? (
                                        <div className="space-y-4">
                                            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-50">
                                                <AlertDescription>{text.successMessage}</AlertDescription>
                                            </Alert>
                                            <Button onClick={() => router.push("/login")} className="w-full bg-orange-600 text-white hover:bg-orange-500">
                                                {text.goToLogin}
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
                                                <Label htmlFor="password" className="text-slate-200">{text.passwordLabel}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="password"
                                                        type={passwordType}
                                                        placeholder={text.passwordPlaceholder}
                                                        value={password}
                                                        onChange={(event) => setPassword(event.target.value)}
                                                        required
                                                        className="border-slate-700 bg-slate-950 pr-11 text-white placeholder:text-slate-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((value) => !value)}
                                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white"
                                                        aria-label={showPassword ? text.hidePassword : text.showPassword}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword" className="text-slate-200">{text.confirmLabel}</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="confirmPassword"
                                                        type={confirmType}
                                                        placeholder={text.confirmPlaceholder}
                                                        value={confirmPassword}
                                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                                        required
                                                        className="border-slate-700 bg-slate-950 pr-11 text-white placeholder:text-slate-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword((value) => !value)}
                                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white"
                                                        aria-label={showConfirmPassword ? text.hidePassword : text.showPassword}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-400">
                                                <div className="mb-2 font-medium text-slate-200">{text.ruleTitle}</div>
                                                <ul className="space-y-1">
                                                    <li>• {text.rule1}</li>
                                                    <li>• {text.rule2}</li>
                                                    <li>• {text.rule3}</li>
                                                </ul>
                                            </div>

                                            <Button type="submit" className="w-full bg-orange-600 text-white hover:bg-orange-500" disabled={loading}>
                                                {loading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        {text.updating}
                                                    </>
                                                ) : (
                                                    text.updateButton
                                                )}
                                            </Button>
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

