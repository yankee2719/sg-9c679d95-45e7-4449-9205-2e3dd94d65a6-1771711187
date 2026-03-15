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
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
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
        seo: "Sicurezza - MACHINA",
        title: "Sicurezza account",
        subtitle: "Gestisci autenticazione a due fattori e livello di garanzia della sessione.",
        currentLevel: "Livello corrente",
        nextLevel: "Livello richiesto",
        verified: "Sessione verificata con 2FA",
        notVerified: "Sessione non ancora verificata con 2FA",
        setupTitle: "Nuovo autenticatore",
        setupDescription: "Configura una app TOTP come Google Authenticator, Authy o 1Password.",
        factorName: "Nome fattore",
        factorNamePlaceholder: "Es. iPhone di Denis",
        defaultFactorName: "Authenticator principale",
        startSetup: "Avvia configurazione",
        qrUnavailable: "QR non disponibile",
        scanQr: "Scansiona il QR code con la tua app di autenticazione.",
        manualSecret: "Oppure inserisci manualmente questo secret:",
        verificationCode: "Codice di verifica",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verifica e attiva",
        cancel: "Annulla",
        activeFactors: "Fattori attivi",
        noFactors: "Nessun fattore verificato presente.",
        active: "Attivo",
        pending: "In attesa",
        remove: "Rimuovi",
        removeConfirm: "Conferma rimozione",
        addedOn: "Aggiunto il",
        loadError: "Impossibile caricare le impostazioni di sicurezza.",
        enrollStarted: "Configurazione avviata",
        enrollStartedDescription: "Scansiona il QR code e inserisci il primo codice per completare l’attivazione.",
        enrollError: "Errore avvio 2FA",
        enrollErrorDescription: "Non è stato possibile iniziare la configurazione del fattore.",
        verifiedToast: "2FA attivata",
        verifiedDescription: "Il fattore è stato verificato con successo.",
        verifyError: "Errore verifica",
        verifyErrorDescription: "Il codice inserito non è valido o è scaduto.",
        removed: "Fattore rimosso",
        removedDescription: "Il fattore MFA è stato eliminato.",
        removeError: "Errore rimozione",
        removeErrorDescription: "Non è stato possibile rimuovere il fattore selezionato.",
    },
    en: {
        seo: "Security - MACHINA",
        title: "Account security",
        subtitle: "Manage two-factor authentication and session assurance level.",
        currentLevel: "Current level",
        nextLevel: "Required level",
        verified: "Session verified with 2FA",
        notVerified: "Session not yet verified with 2FA",
        setupTitle: "New authenticator",
        setupDescription: "Set up a TOTP app such as Google Authenticator, Authy, or 1Password.",
        factorName: "Factor name",
        factorNamePlaceholder: "Example: Denis iPhone",
        defaultFactorName: "Primary authenticator",
        startSetup: "Start setup",
        qrUnavailable: "QR unavailable",
        scanQr: "Scan the QR code with your authenticator app.",
        manualSecret: "Or enter this secret manually:",
        verificationCode: "Verification code",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verify and enable",
        cancel: "Cancel",
        activeFactors: "Active factors",
        noFactors: "No verified factors found.",
        active: "Active",
        pending: "Pending",
        remove: "Remove",
        removeConfirm: "Confirm removal",
        addedOn: "Added on",
        loadError: "Unable to load security settings.",
        enrollStarted: "Setup started",
        enrollStartedDescription: "Scan the QR code and enter the first code to complete activation.",
        enrollError: "2FA setup error",
        enrollErrorDescription: "Unable to start factor setup.",
        verifiedToast: "2FA enabled",
        verifiedDescription: "The factor has been verified successfully.",
        verifyError: "Verification error",
        verifyErrorDescription: "The code is invalid or expired.",
        removed: "Factor removed",
        removedDescription: "The MFA factor has been deleted.",
        removeError: "Removal error",
        removeErrorDescription: "Unable to remove the selected factor.",
    },
    fr: {
        seo: "Sécurité - MACHINA",
        title: "Sécurité du compte",
        subtitle: "Gérez l’authentification à deux facteurs et le niveau d’assurance de la session.",
        currentLevel: "Niveau actuel",
        nextLevel: "Niveau requis",
        verified: "Session vérifiée avec la 2FA",
        notVerified: "Session pas encore vérifiée avec la 2FA",
        setupTitle: "Nouvel authentificateur",
        setupDescription: "Configurez une application TOTP comme Google Authenticator, Authy ou 1Password.",
        factorName: "Nom du facteur",
        factorNamePlaceholder: "Ex. iPhone de Denis",
        defaultFactorName: "Authentificateur principal",
        startSetup: "Démarrer la configuration",
        qrUnavailable: "QR indisponible",
        scanQr: "Scannez le QR code avec votre application d’authentification.",
        manualSecret: "Ou saisissez manuellement ce secret :",
        verificationCode: "Code de vérification",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Vérifier et activer",
        cancel: "Annuler",
        activeFactors: "Facteurs actifs",
        noFactors: "Aucun facteur vérifié trouvé.",
        active: "Actif",
        pending: "En attente",
        remove: "Supprimer",
        removeConfirm: "Confirmer la suppression",
        addedOn: "Ajouté le",
        loadError: "Impossible de charger les paramètres de sécurité.",
        enrollStarted: "Configuration démarrée",
        enrollStartedDescription: "Scannez le QR code et saisissez le premier code pour terminer l’activation.",
        enrollError: "Erreur de configuration 2FA",
        enrollErrorDescription: "Impossible de démarrer la configuration du facteur.",
        verifiedToast: "2FA activée",
        verifiedDescription: "Le facteur a été vérifié avec succès.",
        verifyError: "Erreur de vérification",
        verifyErrorDescription: "Le code est invalide ou expiré.",
        removed: "Facteur supprimé",
        removedDescription: "Le facteur MFA a été supprimé.",
        removeError: "Erreur de suppression",
        removeErrorDescription: "Impossible de supprimer le facteur sélectionné.",
    },
    es: {
        seo: "Seguridad - MACHINA",
        title: "Seguridad de la cuenta",
        subtitle: "Gestiona la autenticación de dos factores y el nivel de garantía de la sesión.",
        currentLevel: "Nivel actual",
        nextLevel: "Nivel requerido",
        verified: "Sesión verificada con 2FA",
        notVerified: "Sesión aún no verificada con 2FA",
        setupTitle: "Nuevo autenticador",
        setupDescription: "Configura una app TOTP como Google Authenticator, Authy o 1Password.",
        factorName: "Nombre del factor",
        factorNamePlaceholder: "Ej. iPhone de Denis",
        defaultFactorName: "Autenticador principal",
        startSetup: "Iniciar configuración",
        qrUnavailable: "QR no disponible",
        scanQr: "Escanea el código QR con tu app de autenticación.",
        manualSecret: "O introduce manualmente este secret:",
        verificationCode: "Código de verificación",
        verificationPlaceholder: "000000",
        verifyAndActivate: "Verificar y activar",
        cancel: "Cancelar",
        activeFactors: "Factores activos",
        noFactors: "No se encontraron factores verificados.",
        active: "Activo",
        pending: "Pendiente",
        remove: "Eliminar",
        removeConfirm: "Confirmar eliminación",
        addedOn: "Añadido el",
        loadError: "No se pudieron cargar los ajustes de seguridad.",
        enrollStarted: "Configuración iniciada",
        enrollStartedDescription: "Escanea el QR e introduce el primer código para completar la activación.",
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
    const text = useMemo(() => copy[language], [language]);
    const { toast } = useToast();

    const [userRole, setUserRole] = useState("technician");
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
        const [ctx, factorRows, status] = await Promise.all([getUserContext(), listMfaFactors(), getMfaStatus()]);
        setUserRole(ctx?.role ?? "technician");
        setFactors(factorRows);
        setAal(status.currentLevel ?? null);
        setNextLevel(status.nextLevel ?? null);
    };

    useEffect(() => {
        const init = async () => {
            try {
                await loadAll();
            } catch (error: any) {
                console.error(error);
                toast({ title: text.title, description: error?.message ?? text.loadError, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [text.loadError, text.title, toast]);

    const verifiedFactors = useMemo(() => factors.filter((factor) => factor.status === "verified"), [factors]);

    const handleStartEnroll = async () => {
        setEnrolling(true);
        try {
            const result = await enrollTotpFactor(friendlyName || text.defaultFactorName);
            setPendingFactorId(result.factorId);
            setPendingSecret(result.secret);
            setPendingUri(result.uri);
            toast({ title: text.enrollStarted, description: text.enrollStartedDescription });
        } catch (error: any) {
            console.error(error);
            toast({ title: text.enrollError, description: error?.message ?? text.enrollErrorDescription, variant: "destructive" });
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerifyEnroll = async () => {
        if (!pendingFactorId || !code.trim()) return;
        setVerifying(true);
        try {
            const challenge = await challengeFactor(pendingFactorId);
            await verifyFactor({ factorId: pendingFactorId, challengeId: challenge.id, code });
            toast({ title: text.verifiedToast, description: text.verifiedDescription });
            setCode("");
            setPendingFactorId(null);
            setPendingSecret(null);
            setPendingUri(null);
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({ title: text.verifyError, description: error?.message ?? text.verifyErrorDescription, variant: "destructive" });
        } finally {
            setVerifying(false);
        }
    };

    const handleRemoveFactor = async (factorId: string) => {
        setRemovingFactorId(factorId);
        try {
            await unenrollFactor(factorId);
            toast({ title: text.removed, description: text.removedDescription });
            setConfirmingFactorId(null);
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({ title: text.removeError, description: error?.message ?? text.removeErrorDescription, variant: "destructive" });
        } finally {
            setRemovingFactorId(null);
        }
    };

    return (
        <MainLayout userRole={userRole}>
            <SEO title={text.seo} />

            <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {text.title}
                        </CardTitle>
                        <CardDescription>{text.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <Badge variant={aal === "aal2" ? "default" : "outline"}>{text.currentLevel}: {aal ?? "—"}</Badge>
                        <Badge variant="outline">{text.nextLevel}: {nextLevel ?? "—"}</Badge>
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
                                <div className="space-y-2 max-w-md">
                                    <Label htmlFor="friendlyName">{text.factorName}</Label>
                                    <Input
                                        id="friendlyName"
                                        value={friendlyName}
                                        onChange={(event) => setFriendlyName(event.target.value)}
                                        placeholder={text.factorNamePlaceholder}
                                    />
                                </div>
                                <Button onClick={handleStartEnroll} disabled={enrolling}>
                                    {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                    {text.startSetup}
                                </Button>
                            </>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                                <div className="rounded-2xl border border-border p-4 flex items-center justify-center">
                                    {pendingUri ? <QRCodeGenerator value={pendingUri} size={220} /> : <div className="text-sm text-muted-foreground">{text.qrUnavailable}</div>}
                                </div>

                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">{text.scanQr}</div>
                                    <div className="space-y-2">
                                        <Label>{text.manualSecret}</Label>
                                        <div className="rounded-xl border border-border bg-muted/40 p-3 font-mono text-sm break-all">{pendingSecret ?? "—"}</div>
                                    </div>
                                    <div className="space-y-2 max-w-xs">
                                        <Label htmlFor="verifyCode">{text.verificationCode}</Label>
                                        <Input
                                            id="verifyCode"
                                            value={code}
                                            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder={text.verificationPlaceholder}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={handleVerifyEnroll} disabled={verifying || code.trim().length < 6}>
                                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{text.activeFactors}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : verifiedFactors.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{text.noFactors}</div>
                        ) : (
                            <div className="space-y-3">
                                {verifiedFactors.map((factor) => (
                                    <div key={factor.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="font-medium">{factor.friendly_name || text.defaultFactorName}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {(factor.factor_type ?? "totp").toUpperCase()} · {text.addedOn} {factor.created_at ? new Date(factor.created_at).toLocaleDateString() : "—"}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">{factor.status === "verified" ? text.active : text.pending}</Badge>
                                            {confirmingFactorId === factor.id ? (
                                                <Button variant="destructive" onClick={() => handleRemoveFactor(factor.id)} disabled={removingFactorId === factor.id}>
                                                    {removingFactorId === factor.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                    {text.removeConfirm}
                                                </Button>
                                            ) : (
                                                <Button variant="outline" onClick={() => setConfirmingFactorId(factor.id)}>
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
