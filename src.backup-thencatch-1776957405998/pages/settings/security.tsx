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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    challengeFactor,
    enrollTotpFactor,
    getMfaStatus,
    listMfaFactors,
    unenrollFactor,
    unenrollVerifiedFactorWithCode,
    verifyFactor,
} from "@/services/mfaService";

interface FactorRow {
    id: string;
    friendly_name?: string | null;
    factor_type?: string | null;
    status?: string | null;
    created_at?: string | null;
}

export default function SecuritySettingsPage() {
    const { toast } = useToast();
    const { loading: authLoading, userRole } = useAuth();

    const [loading, setLoading] = useState(true);
    const [factors, setFactors] = useState<FactorRow[]>([]);
    const [aal, setAal] = useState<string | null>(null);
    const [nextLevel, setNextLevel] = useState<string | null>(null);

    const [friendlyName, setFriendlyName] = useState("Autenticatore principale");
    const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
    const [pendingSecret, setPendingSecret] = useState<string | null>(null);
    const [pendingUri, setPendingUri] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [confirmingFactorId, setConfirmingFactorId] = useState<string | null>(null);
    const [removeCode, setRemoveCode] = useState("");
    const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);

    const verifiedFactors = useMemo(
        () => factors.filter((factor) => factor.status === "verified"),
        [factors],
    );

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
                        title: "Sicurezza account",
                        description: error?.message ?? "Impossibile caricare le impostazioni di sicurezza.",
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
    }, [authLoading, toast]);

    const handleStartEnroll = async () => {
        setEnrolling(true);
        try {
            const result = await enrollTotpFactor(friendlyName.trim() || "Autenticatore principale");
            setPendingFactorId(result.factorId);
            setPendingSecret(result.secret);
            setPendingUri(result.uri);
            toast({
                title: "Configurazione avviata",
                description: "Scansiona il QR e inserisci il primo codice per completare l'attivazione.",
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Errore avvio 2FA",
                description: error?.message ?? "Non è stato possibile avviare la configurazione del fattore.",
                variant: "destructive",
            });
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerifyEnroll = async () => {
        if (!pendingFactorId || verifyCode.trim().length < 6) return;
        setVerifying(true);
        try {
            const challenge = await challengeFactor(pendingFactorId);
            await verifyFactor({
                factorId: pendingFactorId,
                challengeId: challenge.id,
                code: verifyCode,
            });
            toast({
                title: "2FA attivata",
                description: "Il fattore è stato verificato correttamente.",
            });
            setPendingFactorId(null);
            setPendingSecret(null);
            setPendingUri(null);
            setVerifyCode("");
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Errore verifica",
                description: error?.message ?? "Il codice non è valido o è scaduto.",
                variant: "destructive",
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleRemoveFactor = async (factor: FactorRow) => {
        setRemovingFactorId(factor.id);
        try {
            if (factor.status === "verified") {
                if (removeCode.trim().length < 6) {
                    throw new Error("Inserisci il codice attuale dell'app Authenticator per confermare la rimozione.");
                }
                await unenrollVerifiedFactorWithCode(factor.id, removeCode);
            } else {
                await unenrollFactor(factor.id);
            }
            toast({
                title: "Fattore rimosso",
                description:
                    factor.status === "verified"
                        ? "La 2FA è stata rimossa dopo verifica del codice Authenticator."
                        : "Il fattore MFA è stato eliminato.",
            });
            setConfirmingFactorId(null);
            setRemoveCode("");
            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Errore rimozione",
                description: error?.message ?? "Non è stato possibile rimuovere il fattore selezionato.",
                variant: "destructive",
            });
        } finally {
            setRemovingFactorId(null);
        }
    };

    return (
        <MainLayout userRole={userRole}>
            <SEO title="Sicurezza account - MACHINA" />

            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Sicurezza account
                        </CardTitle>
                        <CardDescription>
                            La 2FA è opzionale, ma per rimuovere un fattore verificato devi reinserire il codice attuale dell'app Authenticator.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <Badge variant={aal === "aal2" ? "default" : "outline"}>Livello attuale: {aal ?? "—"}</Badge>
                        <Badge variant="outline">Livello successivo: {nextLevel ?? "—"}</Badge>
                        {aal === "aal2" ? (
                            <div className="inline-flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                Verifica MFA completata
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-sm text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                MFA non ancora verificata
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            Configura TOTP
                        </CardTitle>
                        <CardDescription>
                            Attiva un autenticatore TOTP per proteggere funzioni sensibili dell'account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {!pendingFactorId ? (
                            <>
                                <div className="max-w-md space-y-2">
                                    <Label htmlFor="friendlyName">Nome fattore</Label>
                                    <Input
                                        id="friendlyName"
                                        value={friendlyName}
                                        onChange={(event) => setFriendlyName(event.target.value)}
                                        placeholder="Es. iPhone Denis"
                                    />
                                </div>
                                <Button onClick={handleStartEnroll} disabled={enrolling}>
                                    {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                    Avvia configurazione
                                </Button>
                            </>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                                <div className="flex items-center justify-center rounded-2xl border border-border p-4">
                                    {pendingUri ? (
                                        <QRCodeGenerator value={pendingUri} size={220} />
                                    ) : (
                                        <div className="text-sm text-muted-foreground">QR non disponibile</div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">
                                        Scansiona il QR con la tua app di autenticazione.
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Secret manuale</Label>
                                        <div className="break-all rounded-xl border border-border bg-muted/40 p-3 font-mono text-sm">
                                            {pendingSecret ?? "—"}
                                        </div>
                                    </div>
                                    <div className="max-w-xs space-y-2">
                                        <Label htmlFor="verifyCode">Codice di verifica</Label>
                                        <Input
                                            id="verifyCode"
                                            value={verifyCode}
                                            onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, ""))}
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={handleVerifyEnroll} disabled={verifying || verifyCode.trim().length < 6}>
                                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Verifica e attiva
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setPendingFactorId(null);
                                                setPendingSecret(null);
                                                setPendingUri(null);
                                                setVerifyCode("");
                                            }}
                                        >
                                            Annulla
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Fattori registrati</CardTitle>
                        <CardDescription>
                            {verifiedFactors.length > 0
                                ? "Per rimuovere un fattore verificato devi confermare con il codice attuale dell'app Authenticator."
                                : "Nessun fattore verificato attivo."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : factors.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nessun fattore trovato.</div>
                        ) : (
                            <div className="space-y-3">
                                {factors.map((factor) => {
                                    const needsCode = factor.status === "verified";
                                    const isConfirming = confirmingFactorId === factor.id;
                                    const isRemoving = removingFactorId === factor.id;

                                    return (
                                        <div
                                            key={factor.id}
                                            className="flex flex-col gap-4 rounded-xl border border-border p-4"
                                        >
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                    <div className="font-medium">
                                                        {factor.friendly_name || "Autenticatore principale"}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Aggiunto il:{" "}
                                                        {factor.created_at
                                                            ? new Date(factor.created_at).toLocaleString()
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge
                                                        variant={factor.status === "verified" ? "secondary" : "destructive"}
                                                    >
                                                        {factor.status === "verified" ? "Attivo" : "Non verificato"}
                                                    </Badge>

                                                    {!isConfirming ? (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setConfirmingFactorId(factor.id);
                                                                setRemoveCode("");
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Rimuovi
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setConfirmingFactorId(null);
                                                                setRemoveCode("");
                                                            }}
                                                        >
                                                            Annulla
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {isConfirming && (
                                                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                                                    {needsCode ? (
                                                        <>
                                                            <div className="text-sm font-medium">
                                                                Conferma la rimozione con il codice corrente dell'app Authenticator
                                                            </div>
                                                            <div className="max-w-xs space-y-2">
                                                                <Label htmlFor={`remove-code-${factor.id}`}>Codice Authenticator</Label>
                                                                <Input
                                                                    id={`remove-code-${factor.id}`}
                                                                    value={removeCode}
                                                                    onChange={(event) =>
                                                                        setRemoveCode(event.target.value.replace(/\D/g, ""))
                                                                    }
                                                                    inputMode="numeric"
                                                                    maxLength={6}
                                                                    placeholder="000000"
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground">
                                                            Questo fattore non è verificato. Puoi rimuoverlo direttamente.
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap gap-3">
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleRemoveFactor(factor)}
                                                            disabled={isRemoving || (needsCode && removeCode.trim().length < 6)}
                                                        >
                                                            {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Conferma rimozione
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
