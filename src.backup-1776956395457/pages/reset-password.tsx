import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        seoTitle: "Reimposta password - MACHINA",
        seoDescription: "Crea una nuova password per il tuo account MACHINA.",
        invalidTitle: "Link non valido",
        invalidAction: "Richiedi nuovo link",
        invalidMessage: "Link di reset non valido o scaduto. Richiedi un nuovo link.",
        successTitle: "Password aggiornata",
        successMessage: "La tua password è stata reimpostata con successo. Verrai reindirizzato alla pagina di login.",
        goToLogin: "Vai al login",
        title: "Nuova password",
        subtitle: "Crea una nuova password sicura per il tuo account.",
        passwordLabel: "Nuova password",
        passwordPlaceholder: "Minimo 8 caratteri",
        confirmLabel: "Conferma nuova password",
        confirmPlaceholder: "Ripeti la password",
        updateButton: "Aggiorna password",
        updating: "Aggiornamento in corso...",
        showPassword: "Mostra password",
        hidePassword: "Nascondi password",
        genericError: "Errore durante il reset della password",
        minLength: "La password deve contenere almeno 8 caratteri",
        oneUpper: "La password deve contenere almeno una lettera maiuscola",
        oneLower: "La password deve contenere almeno una lettera minuscola",
        oneNumber: "La password deve contenere almeno un numero",
        oneSpecial: "La password deve contenere almeno un carattere speciale (!@#$%^&*)",
        mismatch: "Le password non coincidono",
    },
    en: {
        seoTitle: "Reset password - MACHINA",
        seoDescription: "Create a new password for your MACHINA account.",
        invalidTitle: "Invalid link",
        invalidAction: "Request a new link",
        invalidMessage: "The reset link is invalid or expired. Request a new link.",
        successTitle: "Password updated",
        successMessage: "Your password has been reset successfully. You will be redirected to the login page.",
        goToLogin: "Go to login",
        title: "New password",
        subtitle: "Create a new secure password for your account.",
        passwordLabel: "New password",
        passwordPlaceholder: "At least 8 characters",
        confirmLabel: "Confirm new password",
        confirmPlaceholder: "Repeat the password",
        updateButton: "Update password",
        updating: "Updating...",
        showPassword: "Show password",
        hidePassword: "Hide password",
        genericError: "Error while resetting the password",
        minLength: "Password must contain at least 8 characters",
        oneUpper: "Password must contain at least one uppercase letter",
        oneLower: "Password must contain at least one lowercase letter",
        oneNumber: "Password must contain at least one number",
        oneSpecial: "Password must contain at least one special character (!@#$%^&*)",
        mismatch: "Passwords do not match",
    },
    fr: {
        seoTitle: "Réinitialiser le mot de passe - MACHINA",
        seoDescription: "Créez un nouveau mot de passe pour votre compte MACHINA.",
        invalidTitle: "Lien invalide",
        invalidAction: "Demander un nouveau lien",
        invalidMessage: "Le lien de réinitialisation est invalide ou expiré. Demandez un nouveau lien.",
        successTitle: "Mot de passe mis à jour",
        successMessage: "Votre mot de passe a été réinitialisé avec succès. Vous serez redirigé vers la page de connexion.",
        goToLogin: "Aller à la connexion",
        title: "Nouveau mot de passe",
        subtitle: "Créez un nouveau mot de passe sécurisé pour votre compte.",
        passwordLabel: "Nouveau mot de passe",
        passwordPlaceholder: "Au moins 8 caractères",
        confirmLabel: "Confirmer le nouveau mot de passe",
        confirmPlaceholder: "Répétez le mot de passe",
        updateButton: "Mettre à jour le mot de passe",
        updating: "Mise à jour en cours...",
        showPassword: "Afficher le mot de passe",
        hidePassword: "Masquer le mot de passe",
        genericError: "Erreur lors de la réinitialisation du mot de passe",
        minLength: "Le mot de passe doit contenir au moins 8 caractères",
        oneUpper: "Le mot de passe doit contenir au moins une majuscule",
        oneLower: "Le mot de passe doit contenir au moins une minuscule",
        oneNumber: "Le mot de passe doit contenir au moins un chiffre",
        oneSpecial: "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)",
        mismatch: "Les mots de passe ne correspondent pas",
    },
    es: {
        seoTitle: "Restablecer contraseña - MACHINA",
        seoDescription: "Crea una nueva contraseña para tu cuenta MACHINA.",
        invalidTitle: "Enlace no válido",
        invalidAction: "Solicitar nuevo enlace",
        invalidMessage: "El enlace de restablecimiento no es válido o ha caducado. Solicita uno nuevo.",
        successTitle: "Contraseña actualizada",
        successMessage: "Tu contraseña se ha restablecido correctamente. Serás redirigido a la página de acceso.",
        goToLogin: "Ir al acceso",
        title: "Nueva contraseña",
        subtitle: "Crea una nueva contraseña segura para tu cuenta.",
        passwordLabel: "Nueva contraseña",
        passwordPlaceholder: "Mínimo 8 caracteres",
        confirmLabel: "Confirmar nueva contraseña",
        confirmPlaceholder: "Repite la contraseña",
        updateButton: "Actualizar contraseña",
        updating: "Actualizando...",
        showPassword: "Mostrar contraseña",
        hidePassword: "Ocultar contraseña",
        genericError: "Error al restablecer la contraseña",
        minLength: "La contraseña debe contener al menos 8 caracteres",
        oneUpper: "La contraseña debe contener al menos una letra mayúscula",
        oneLower: "La contraseña debe contener al menos una letra minúscula",
        oneNumber: "La contraseña debe contener al menos un número",
        oneSpecial: "La contraseña debe contener al menos un carácter especial (!@#$%^&*)",
        mismatch: "Las contraseñas no coinciden",
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

        checkSession();
    }, [text.invalidMessage]);

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) return text.minLength;
        if (!/[A-Z]/.test(pwd)) return text.oneUpper;
        if (!/[a-z]/.test(pwd)) return text.oneLower;
        if (!/[0-9]/.test(pwd)) return text.oneNumber;
        if (!/[!@#$%^&*]/.test(pwd)) return text.oneSpecial;
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
            setError(text.mismatch);
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : text.genericError;
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!validToken && error) {
        return (
            <>
                <SEO title={text.seoTitle} description={text.seoDescription} />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 px-4">
                    <div className="w-full max-w-md">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
                                {text.invalidTitle}
                            </h1>

                            <p className="text-center text-slate-600 dark:text-slate-300 mb-6">{error}</p>

                            <Button
                                onClick={() => router.push("/forgot-password")}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                {text.invalidAction}
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
                                {text.successTitle}
                            </h1>

                            <p className="text-center text-slate-600 dark:text-slate-300 mb-6">{text.successMessage}</p>

                            <Button
                                onClick={() => router.push("/login")}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                {text.goToLogin}
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
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">{text.title}</h1>
                        <p className="text-center text-slate-600 dark:text-slate-300 mb-8">{text.subtitle}</p>

                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-900 dark:text-white">
                                    {text.passwordLabel}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={text.passwordPlaceholder}
                                        required
                                        disabled={loading}
                                        className="pr-11 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? text.hidePassword : text.showPassword}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-900 dark:text-white">
                                    {text.confirmLabel}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder={text.confirmPlaceholder}
                                        required
                                        disabled={loading}
                                        className="pr-11 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={showConfirmPassword ? text.hidePassword : text.showPassword}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11"
                            >
                                {loading ? text.updating : text.updateButton}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
