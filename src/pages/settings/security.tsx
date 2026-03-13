import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import {
    Shield,
    Smartphone,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    KeyRound,
} from "lucide-react";
import {
    enrollTotpFactor,
    challengeFactor,
    verifyFactor,
    listMfaFactors,
    unenrollFactor,
    getMfaStatus,
} from "@/services/mfaService";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";

interface FactorRow {
    id: string;
    friendly_name?: string | null;
    factor_type?: string | null;
    status?: string | null;
    created_at?: string | null;
}

export default function SecuritySettingsPage() {
    const { toast } = useToast();
    const { t } = useLanguage();

    const [userRole, setUserRole] = useState("technician");
    const [loading, setLoading] = useState(true);
    const [factors, setFactors] = useState < FactorRow[] > ([]);
    const [aal, setAal] = useState < string | null > (null);
    const [nextLevel, setNextLevel] = useState < string | null > (null);

    const [friendlyName, setFriendlyName] = useState(t("security.defaultFactorName"));
    const [code, setCode] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [removingFactorId, setRemovingFactorId] = useState < string | null > (null);

    const [pendingFactorId, setPendingFactorId] = useState < string | null > (null);
    const [pendingSecret, setPendingSecret] = useState < string | null > (null);
    const [pendingUri, setPendingUri] = useState < string | null > (null);

    const loadAll = async () => {
        const [ctx, factorRows, status] = await Promise.all([
            getUserContext(),
            listMfaFactors(),
            getMfaStatus(),
        ]);

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
                toast({
                    title: t("security.toast.error"),
                    description: error?.message ?? t("security.toast.loadError"),
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const verifiedFactors = useMemo(
        () => factors.filter((f) => f.status === "verified"),
        [factors]
    );

    const handleStartEnroll = async () => {
        setEnrolling(true);
        try {
            const result = await enrollTotpFactor(friendlyName);

            setPendingFactorId(result.factorId);
            setPendingSecret(result.secret);
            setPendingUri(result.uri);

            toast({
                title: t("security.toast.enrollStarted"),
                description: t("security.toast.enrollStartedDescription"),
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("security.toast.enrollError"),
                description: error?.message ?? t("security.toast.enrollErrorDescription"),
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
                title: t("security.toast.verified"),
                description: t("security.toast.verifiedDescription"),
            });

            setCode("");
            setPendingFactorId(null);
            setPendingSecret(null);
            setPendingUri(null);

            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("security.toast.verifyError"),
                description: error?.message ?? t("security.toast.verifyErrorDescription"),
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
                title: t("security.toast.removed"),
                description: t("security.toast.removedDescription"),
            });

            await loadAll();
        } catch (error: any) {
            console.error(error);
            toast({
                title: t("security.toast.removeError"),
                description: error?.message ?? t("security.toast.removeErrorDescription"),
                variant: "destructive",
            });
        } finally {
            setRemovingFactorId(null);
        }
    };

    return (
        <MainLayout userRole={userRole}>
            <SEO title={`Sicurezza - MACHINA`} />

            <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {t("security.title")}
                        </CardTitle>
                        <CardDescription>
                            {t("security.subtitle")}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-wrap items-center gap-3">
                        <Badge variant={aal === "aal2" ? "default" : "outline"}>
                            {t("security.currentLevel")}: {aal ?? "—"}
                        </Badge>

                        <Badge variant="outline">
                            {t("security.nextLevel")}: {nextLevel ?? "—"}
                        </Badge>

                        {aal === "aal2" ? (
                            <div className="inline-flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                {t("security.verified")}
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-sm text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {t("security.notVerified")}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            {t("security.newAuthenticator")}
                        </CardTitle>
                        <CardDescription>
                            {t("security.newAuthenticatorDescription")}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-5">
                        {!pendingFactorId ? (
                            <>
                                <div className="space-y-2 max-w-md">
                                    <Label htmlFor="friendlyName">{t("security.factorName")}</Label>
                                    <Input
                                        id="friendlyName"
                                        value={friendlyName}
                                        onChange={(e) => setFriendlyName(e.target.value)}
                                        placeholder={t("security.factorNamePlaceholder")}
                                    />
                                </div>

                                <Button onClick={handleStartEnroll} disabled={enrolling}>
                                    {enrolling ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <KeyRound className="mr-2 h-4 w-4" />
                                    )}
                                    {t("security.startSetup")}
                                </Button>
                            </>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                                <div className="rounded-2xl border border-border p-4 flex items-center justify-center">
                                    {pendingUri ? (
                                        <QRCodeGenerator value={pendingUri} size={220} />
                                    ) : (
                                        <div className="text-sm text-muted-foreground">{t("security.qrUnavailable")}</div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-sm font-medium">{t("security.manualSecret")}</div>
                                        <div className="mt-1 rounded-xl bg-muted p-3 font-mono text-sm break-all">
                                            {pendingSecret ?? "—"}
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-w-xs">
                                        <Label htmlFor="totpCode">{t("security.codeLabel")}</Label>
                                        <Input
                                            id="totpCode"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            placeholder="123456"
                                            inputMode="numeric"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={handleVerifyEnroll} disabled={verifying || !code.trim()}>
                                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("security.verifyAndEnable")}
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
                                            {t("common.cancel")}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>{t("security.registeredFactors")}</CardTitle>
                        <CardDescription>
                            {t("security.registeredFactorsDescription")}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-sm text-muted-foreground">{t("security.loadingFactors")}</div>
                        ) : verifiedFactors.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{t("security.noFactors")}</div>
                        ) : (
                            <div className="space-y-3">
                                {verifiedFactors.map((factor) => (
                                    <div
                                        key={factor.id}
                                        className="rounded-xl border border-border p-4 flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">
                                                {factor.friendly_name || t("security.authenticatorFallback")}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {factor.factor_type || "totp"} · {factor.status || "verified"}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={() => handleRemoveFactor(factor.id)}
                                            disabled={removingFactorId === factor.id}
                                        >
                                            {removingFactorId === factor.id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="mr-2 h-4 w-4" />
                                            )}
                                            {t("security.remove")}
                                        </Button>
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