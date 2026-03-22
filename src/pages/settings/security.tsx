import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    KeyRound,
    Loader2,
    Shield,
    Smartphone,
    Trash2,
} from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    challengeFactor,
    enrollTotpFactor,
    getMfaStatus,
    listMfaFactors,
    unenrollFactor,
    verifyFactor,
} from "@/services/mfaService";

interface FactorRow {
    id: string;
    friendly_name?: string | null;
    factor_type?: string | null;
    status?: string | null;
    created_at?: string | null;
}

const copy = {
    it: {
        seo: "Sicurezza account - MACHINA",
        title: "Sicurezza account",
        subtitle:
            "Configura l'autenticazione a due fattori. La web app usa il contesto di sessione reale, non controlli duplicati sparsi.",
        currentLevel: "Livello attuale",
        nextLevel: "Livello successivo",
        verified: "Verifica MFA completata",
        notVerified: "MFA non ancora verificata",
        setupTitle: "Configura TOTP",
        setupDescription:
            "Attiva un autenticatore TOTP per passare ad AAL2 e proteggere funzioni sensibili.",
        factorName: "Nome fattore",
        factorNamePlaceholder: "Es. iPhone Denis",
        defaultFactorName: "Autenticatore principale",
        startSetup: "Avvia configurazione",
        qrUnavailable: "QR non disponibile",
        scanQr: "Scansiona il QR con la tua app di autenticazione.",
        manualSecret: "Oppure inserisci manualmente questo secret:",
        verificationCode: "Codice di verifica",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verifica e attiva",
        cancel: "Annulla",
        activeFactors: "Fattori registrati",
        noFactors: "Nessun fattore trovato.",
        active: "Attivo",
        pending: "Non verificato",
        remove: "Rimuovi",
        removeConfirm: "Conferma rimozione",
        addedOn: "Aggiunto il",
        loadError: "Impossibile caricare le impostazioni di sicurezza.",
        enrollStarted: "Configurazione avviata",
        enrollStartedDescription:
            "Scansiona il QR e inserisci il primo codice per completare l'attivazione.",
        enrollError: "Errore avvio 2FA",
        enrollErrorDescription: "Non è stato possibile avviare la configurazione del fattore.",
        verifiedToast: "2FA attivata",
        verifiedDescription: "Il fattore è stato verificato correttamente.",
        verifyError: "Errore verifica",
        verifyErrorDescription: "Il codice non è valido o è scaduto.",
        removed: "Fattore rimosso",
        removedDescription: "Il fattore MFA è stato eliminato.",
        removeError: "Errore rimozione",
        removeErrorDescription: "Non è stato possibile rimuovere il fattore selezionato.",
    },
    en: {
        seo: "Account security - MACHINA",
        title: "Account security",
        subtitle:
            "Configure two-factor authentication. The app must use the real session context, not duplicated checks all over the UI.",
        currentLevel: "Current level",
        nextLevel: "Next level",
        verified: "MFA verification completed",
        notVerified: "MFA not yet verified",
        setupTitle: "Set up TOTP",
        setupDescription:
            "Enable a TOTP authenticator to move to AAL2 and protect sensitive actions.",
        factorName: "Factor name",
        factorNamePlaceholder: "Ex. Denis iPhone",
        defaultFactorName: "Primary authenticator",
        startSetup: "Start setup",
        qrUnavailable: "QR unavailable",
        scanQr: "Scan the QR code with your authenticator app.",
        manualSecret: "Or manually type this secret:",
        verificationCode: "Verification code",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verify and activate",
        cancel: "Cancel",
        activeFactors: "Registered factors",
        noFactors: "No factors found.",
        active: "Active",
        pending: "Unverified",
        remove: "Remove",
        removeConfirm: "Confirm removal",
        addedOn: "Added on",
        loadError: "Unable to load security settings.",
        enrollStarted: "Setup started",
        enrollStartedDescription:
            "Scan the QR code and enter the first code to complete activation.",
        enrollError: "2FA setup error",
        enrollErrorDescription: "Unable to start factor setup.",
        verifiedToast: "2FA enabled",
        verifiedDescription: "The factor has been verified successfully.",
        verifyError: "Verification error",
        verifyErrorDescription: "The code is invalid or expired.",
        removed: "Factor removed",
        removedDescription: "The MFA factor has been removed.",
        removeError: "Remove error",
        removeErrorDescription: "Unable to remove the selected factor.",
    },
    fr: {
        seo: "Sécurité du compte - MACHINA",
        title: "Sécurité du compte",
        subtitle:
            "Configurez l'authentification à deux facteurs. L'application doit utiliser le vrai contexte de session.",
        currentLevel: "Niveau actuel",
        nextLevel: "Niveau suivant",
        verified: "Vérification MFA terminée",
        notVerified: "MFA pas encore vérifiée",
        setupTitle: "Configurer TOTP",
        setupDescription:
            "Activez un authentificateur TOTP pour passer à AAL2 et protéger les actions sensibles.",
        factorName: "Nom du facteur",
        factorNamePlaceholder: "Ex. iPhone Denis",
        defaultFactorName: "Authentificateur principal",
        startSetup: "Démarrer la configuration",
        qrUnavailable: "QR indisponible",
        scanQr: "Scannez le QR avec votre application d'authentification.",
        manualSecret: "Ou saisissez manuellement ce secret :",
        verificationCode: "Code de vérification",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Vérifier et activer",
        cancel: "Annuler",
        activeFactors: "Facteurs enregistrés",
        noFactors: "Aucun facteur trouvé.",
        active: "Actif",
        pending: "Non vérifié",
        remove: "Supprimer",
        removeConfirm: "Confirmer la suppression",
        addedOn: "Ajouté le",
        loadError: "Impossible de charger les paramètres de sécurité.",
        enrollStarted: "Configuration démarrée",
        enrollStartedDescription:
            "Scannez le QR et saisissez le premier code pour terminer l'activation.",
        enrollError: "Erreur configuration 2FA",
        enrollErrorDescription: "Impossible de démarrer la configuration du facteur.",
        verifiedToast: "2FA activée",
        verifiedDescription: "Le facteur a été vérifié avec succès.",
        verifyError: "Erreur de vérification",
        verifyErrorDescription: "Le code n'est pas valide ou a expiré.",
        removed: "Facteur supprimé",
        removedDescription: "Le facteur MFA a été supprimé.",
        removeError: "Erreur suppression",
        removeErrorDescription: "Impossible de supprimer le facteur sélectionné.",
    },
    es: {
        seo: "Seguridad de la cuenta - MACHINA",
        title: "Seguridad de la cuenta",
        subtitle:
            "Configura la autenticación de dos factores. La app debe usar el contexto real de sesión.",
        currentLevel: "Nivel actual",
        nextLevel: "Siguiente nivel",
        verified: "Verificación MFA completada",
        notVerified: "MFA aún no verificada",
        setupTitle: "Configurar TOTP",
        setupDescription:
            "Activa un autenticador TOTP para pasar a AAL2 y proteger acciones sensibles.",
        factorName: "Nombre del factor",
        factorNamePlaceholder: "Ej. iPhone Denis",
        defaultFactorName: "Autenticador principal",
        startSetup: "Iniciar configuración",
        qrUnavailable: "QR no disponible",
        scanQr: "Escanea el código QR con tu app de autenticación.",
        manualSecret: "O introduce manualmente este secret:",
        verificationCode: "Código de verificación",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verificar y activar",
        cancel: "Cancelar",
        activeFactors: "Factores registrados",
        noFactors: "No se encontraron factores.",
        active: "Activo",
        pending: "No verificado",
        remove: "Eliminar",
        removeConfirm: "Confirmar eliminación",
        addedOn: "Añadido el",
        loadError: "No se pudieron cargar los ajustes de seguridad.",
        enrollStarted: "Configuración iniciada",
        enrollStartedDescription:
            "Escanea el QR e introduce el primer código para completar la activación.",
        enrollError: "Error al iniciar 2FA",
        enrollErrorDescription: "No se pudo iniciar la configuración del factor.",
        verifiedToast: "2FA activada",
        verifiedDescription: "El factor se verificó correctamente.",
        verifyError: "Error de verificación",
        verifyErrorDescription: "El código no es válido o ha caducado.",
        removed: "Factor eliminado",
        removedDescription: "El factor MFA se ha eliminado.",
        removeError: "Error al eliminar",
        removeErrorDescription: "No se pudo eliminar el factor seleccionado.",
    },
} as const;

export default function SecuritySettingsPage() {
    const { language } = useLanguage();
    const text = useMemo(
        () => copy[(language as keyof typeof copy) || "it"] ?? copy.it,
        [language]
    );
    const { toast } = useToast();
    const { loading: authLoading, membership } = useAuth();

    const userRole = membership?.role ?? "technician";

    const [loading, setLoading] = useState(true);
    const [factors, setFactors] = useState < FactorRow[] > ([]);
    const [aal, setAal] = useState < string | null > (null);
    const [nextLevel, setNextLevel] = useState < string | null > (null);
    const [friendlyName, setFriendlyName] = useState(text.defaultFactorName);
    const [code, setCode] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [removingFactorId, setRemovingFactorId] = useState < string | null > (null);
    const [confirmingFactorId, setConfirmingFactorId] = useState < string | null > (null);
    const [pendingFactorId, setPendingFactorId] = useState < string | null > (null);
    const [pendingSecret, setPendingSecret] = useState < string | null > (null);
    const [pendingUri, setPendingUri] = useState < string | null > (null);

    useEffect(() => {
        setFriendlyName((current) => (current.trim() ? current : text.defaultFactorName));
    }, [text.defaultFactorName]);

    const loadAll = async () => {
        const [factorRows, status] = await Promise.all([listMfaFactors(), getMfaStatus()]);
        setFactors(factorRows);
        setAal(status.currentLevel ?? null);
        setNextLevel(status.nextLevel ?? null);
    };

    useEffect(() => {
        let active = true;

        const init = async () => {
            if (authLoading) return;

            try {
                await loadAll();
            } catch (error: any) {
                console.error(error);
                if (active) {
                    toast({
                        title: text.title,
                        description: error?.message ?? text.loadError,
                        variant: "destructive",
                    });
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void init();

        return () => {
            active = false;
        };
    }, [authLoading, text.loadError, text.title, toast]);

    // ─── FIX: mostra TUTTI i fattori, non solo i verified ───
    // Così l'utente può rimuovere fattori bloccati in stato "unverified"
    // che impediscono di crearne di nuovi (errore "already exists").
    const allFactors = factors;
    const hasVerifiedFactor = factors.some((f) => f.status === "verified");

    const handleStartEnroll = async () => {
        setEnrolling(true);
        try {
            const result = await enrollTotpFactor(friendlyName || text.defaultFactorName);
            setPendingFactorId(result.factorId);
            setPendingSecret(result.secret);
            setPendingUri(result.uri);
            toast({
                title: text.enrollStarted,
                description: text.enrollStartedDescription,
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.enrollError,
                description: error?.message ?? text.enrollErrorDescription,
                variant: "destructive",
            });
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerifyEnroll = async () => {
        if (!pendingFactorId || !code.trim()) return;

        setVerifying(true);
        try {
            const challenge = await challengeFactor(pendingFactorId);
            await verifyFactor({
                factorId: pendingFactorId,
                challengeId: challenge.id,
                code,
            });

            toast({
                title: text.verifiedToast,
                description: text.verifiedDescription,
            });

            setCode("");
            setPendingFactorId(null);
            setPendingSecret(null);
            setPendingUri(null);
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.verifyError,
                description: error?.message ?? text.verifyErrorDescription,
                variant: "destructive",
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleRemoveFactor = async (factorId: string) => {
        setRemovingFactorId(factorId);
        try {
            await unenrollFactor(factorId);
            toast({
                title: text.removed,
                description: text.removedDescription,
            });
            setConfirmingFactorId(null);
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: text.removeError,
                description: error?.message ?? text.removeErrorDescription,
                variant: "destructive",
            });
        } finally {
            setRemovingFactorId(null);
        }
    };

    return (
        <MainLayout userRole={userRole}>
            <SEO title={text.seo} />

            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {text.title}
                        </CardTitle>
                        <CardDescription>{text.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <Badge variant={aal === "aal2" ? "default" : "outline"}>
                            {text.currentLevel}: {aal ?? "—"}
                        </Badge>
                        <Badge variant="outline">
                            {text.nextLevel}: {nextLevel ?? "—"}
                        </Badge>

                        {aal === "aal2" ? (
                            <div className="inline-flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {text.verified}
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-sm text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {text.notVerified}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            {text.setupTitle}
                        </CardTitle>
                        <CardDescription>{text.setupDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {!pendingFactorId ? (
                            <>
                                <div className="max-w-md space-y-2">
                                    <Label htmlFor="friendlyName">{text.factorName}</Label>
                                    <Input
                                        id="friendlyName"
                                        value={friendlyName}
                                        onChange={(event) => setFriendlyName(event.target.value)}
                                        placeholder={text.factorNamePlaceholder}
                                    />
                                </div>

                                <Button onClick={handleStartEnroll} disabled={enrolling}>
                                    {enrolling ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <KeyRound className="mr-2 h-4 w-4" />
                                    )}
                                    {text.startSetup}
                                </Button>
                            </>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                                <div className="flex items-center justify-center rounded-2xl border border-border p-4">
                                    {pendingUri ? (
                                        <QRCodeGenerator value={pendingUri} size={220} />
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            {text.qrUnavailable}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">
                                        {text.scanQr}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{text.manualSecret}</Label>
                                        <div className="break-all rounded-xl border border-border bg-muted/40 p-3 font-mono text-sm">
                                            {pendingSecret ?? "—"}
                                        </div>
                                    </div>

                                    <div className="max-w-xs space-y-2">
                                        <Label htmlFor="verifyCode">{text.verificationCode}</Label>
                                        <Input
                                            id="verifyCode"
                                            value={code}
                                            onChange={(event) =>
                                                setCode(event.target.value.replace(/\D/g, ""))
                                            }
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder={text.verificationPlaceholder}
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            onClick={handleVerifyEnroll}
                                            disabled={verifying || code.trim().length < 6}
                                        >
                                            {verifying && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {text.verifyAndActivate}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setPendingFactorId(null);
                                                setPendingSecret(null);
                                                setPendingUri(null);
                                                setCode("");
                                            }}
                                        >
                                            {text.cancel}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ─── FIX: mostra TUTTI i fattori, inclusi quelli non verificati ─── */}
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.activeFactors}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : allFactors.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                {text.noFactors}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allFactors.map((factor) => (
                                    <div
                                        key={factor.id}
                                        className="flex flex-col gap-4 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {factor.friendly_name || text.defaultFactorName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {text.addedOn}:{" "}
                                                {factor.created_at
                                                    ? new Date(factor.created_at).toLocaleString()
                                                    : "—"}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant={
                                                    factor.status === "verified"
                                                        ? "secondary"
                                                        : "destructive"
                                                }
                                            >
                                                {factor.status === "verified"
                                                    ? text.active
                                                    : text.pending}
                                            </Badge>

                                            {confirmingFactorId === factor.id ? (
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleRemoveFactor(factor.id)}
                                                    disabled={removingFactorId === factor.id}
                                                >
                                                    {removingFactorId === factor.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                    )}
                                                    {text.removeConfirm}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setConfirmingFactorId(factor.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {text.remove}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
