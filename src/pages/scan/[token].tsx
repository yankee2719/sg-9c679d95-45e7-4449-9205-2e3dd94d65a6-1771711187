import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { getQrTokenService } from "@/services/offlineAndQrService";
import { Loader2, ShieldCheck, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanState = "loading" | "redirecting" | "denied" | "offline_success" | "error";

export default function ScanPage() {
    const router = useRouter();
    const { token } = router.query;
    const { t } = useLanguage();

    const [state, setState] = useState < ScanState > ("loading");
    const [denialReason, setDenialReason] = useState("");
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!router.isReady || !token || typeof token !== "string") return;
        handleScan(token);
    }, [router.isReady, token]);

    const handleScan = async (tokenValue: string) => {
        const qrService = getQrTokenService();

        try {
            const res = await fetch("/api/qr/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token: tokenValue }),
            });

            const payload = await res.json();

            if (res.ok) {
                const { equipment_id, allowed_views = [], max_permission_level } = payload;
                qrService.cacheTokenForOffline(tokenValue, { equipment_id, allowed_views, max_permission_level, is_active: true });
                setState("redirecting");
                router.push(`/equipment/${equipment_id}?from=qr&views=${allowed_views.join(",")}`);
                return;
            }

            setDenialReason(payload?.denial_reason || "access_denied");
            setState("denied");
        } catch {
            setIsOffline(true);
            const offlineResult = qrService.validateTokenOffline(tokenValue);

            if (offlineResult?.is_valid && offlineResult.equipment_id) {
                setState("offline_success");
                setTimeout(() => { router.push(`/equipment/${offlineResult.equipment_id}?from=qr&offline=true`); }, 1500);
                return;
            }

            if (offlineResult && !offlineResult.is_valid) {
                setDenialReason(offlineResult.denial_reason || "access_denied");
                setState("denied");
                return;
            }

            setState("error");
        }
    };

    const denialMessages: Record<string, string> = {
        expired: t("scan.deniedExpired") || "Questo QR code è scaduto. Chiedi un nuovo codice all'amministratore.",
        revoked: t("scan.deniedRevoked") || "Questo QR code è stato revocato.",
        max_scans_exceeded: t("scan.deniedMaxScans") || "Questo QR code ha raggiunto il numero massimo di utilizzi.",
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
                {state === "loading" && (
                    <div className="space-y-4">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{t("scan.validating") || "Validazione QR in corso"}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t("scan.wait") || "Attendi un istante..."}</p>
                        </div>
                    </div>
                )}

                {state === "redirecting" && (
                    <div className="space-y-4">
                        <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
                        <div>
                            <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">{t("scan.accessGranted") || "Accesso consentito"}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t("scan.redirecting") || "Reindirizzamento alla macchina..."}</p>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-green-600" />
                    </div>
                )}

                {state === "offline_success" && (
                    <div className="space-y-4">
                        <div className="flex justify-center gap-2">
                            <ShieldCheck className="h-10 w-10 text-green-600" />
                            <WifiOff className="mt-1 h-8 w-8 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">{t("scan.offlineAccess") || "Accesso offline consentito"}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{t("scan.offlineNote") || "Sto usando dati salvati in locale. Potrebbero non essere aggiornati."}</p>
                        </div>
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-green-600" />
                    </div>
                )}

                {state === "denied" && (
                    <div className="space-y-4">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
                        <div>
                            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">{t("scan.accessDenied") || "Accesso negato"}</h2>
                            <p className="mt-1 text-sm capitalize text-muted-foreground">{denialReason.replace(/_/g, " ")}</p>
                        </div>
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            <p>{denialMessages[denialReason] || t("scan.deniedGeneric") || "Non hai i permessi per accedere a questa macchina."}</p>
                        </div>
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>{t("nav.dashboard")}</Button>
                    </div>
                )}

                {state === "error" && (
                    <div className="space-y-4">
                        {isOffline ? <WifiOff className="mx-auto h-12 w-12 text-orange-500" /> : <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />}
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {isOffline ? t("scan.noOfflineData") || "Nessun dato offline disponibile" : t("scan.errorOccurred") || "Si è verificato un errore"}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {isOffline ? t("scan.offlineNotCached") || "Sei offline e questo QR non è stato ancora memorizzato in locale." : t("scan.errorValidate") || "Impossibile validare il QR code. Riprova."}
                            </p>
                        </div>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>{t("nav.dashboard")}</Button>
                            <Button onClick={() => { setState("loading"); handleScan(token as string); }}>{t("scan.retry") || "Riprova"}</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
