import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Download, X, HardDrive } from "lucide-react";
import { usePWA } from "@/contexts/PWAProvider";
import { getOfflineSyncCount, getOfflineSyncLastRun } from "@/lib/offlineOpsQueue";
import { runOfflineSync } from "@/lib/offlineSyncClient";

export function OfflineStatusBar() {
    const { isOnline, isInstallable, installApp } = usePWA();
    const [pendingOperations, setPendingOperations] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState < { ok: boolean; msg: string } | null > (null);
    const [lastSync, setLastSync] = useState < string | null > (null);
    const [dismissed, setDismissed] = useState(false);

    const refresh = useCallback(() => {
        setPendingOperations(getOfflineSyncCount());
        setLastSync(getOfflineSyncLastRun());
    }, []);

    useEffect(() => {
        refresh();
        const intervalId = window.setInterval(refresh, 4_000);
        return () => window.clearInterval(intervalId);
    }, [refresh]);

    useEffect(() => {
        if (isOnline && pendingOperations > 0 && !syncing) {
            void handleSync();
        }
    }, [isOnline, pendingOperations, syncing]);

    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const result = await runOfflineSync();
            setLastSync(result.lastSync);
            setSyncResult({ ok: result.ok, msg: result.message });
            refresh();
        } catch (error: any) {
            setSyncResult({ ok: false, msg: error?.message || "Sincronizzazione fallita" });
        } finally {
            setSyncing(false);
            window.setTimeout(() => setSyncResult(null), 4_000);
        }
    };

    const shouldShow = !isOnline || pendingOperations > 0 || syncResult || isInstallable;
    if (!shouldShow || dismissed) return null;

    return (
        <div
            className={`z-50 flex w-full items-center justify-between gap-3 px-4 py-2 text-sm transition-all ${isOnline
                    ? "border-b border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
                    : "border-b border-amber-300 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
                }`}
        >
            <div className="flex flex-wrap items-center gap-3">
                {isOnline ? (
                    <Wifi className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                ) : (
                    <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}

                <span className={isOnline ? "text-blue-700 dark:text-blue-300" : "font-medium text-amber-700 dark:text-amber-300"}>
                    {isOnline ? "Online" : "Offline — dati locali disponibili"}
                </span>

                {pendingOperations > 0 && (
                    <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        {pendingOperations} in coda
                    </Badge>
                )}

                {syncResult && (
                    <div className={`flex items-center gap-1 ${syncResult.ok ? "text-green-600" : "text-red-600"}`}>
                        {syncResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <span className="text-xs">{syncResult.msg}</span>
                    </div>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {lastSync && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                        Sync: {new Date(lastSync).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                )}

                <Button asChild size="sm" variant="outline" className="h-7 rounded-lg text-xs">
                    <Link href="/offline">
                        <HardDrive className="mr-1 h-3 w-3" /> Centro offline
                    </Link>
                </Button>

                {isOnline && pendingOperations > 0 && (
                    <Button size="sm" variant="outline" onClick={() => void handleSync()} disabled={syncing} className="h-7 rounded-lg text-xs">
                        <RefreshCw className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Sync..." : "Sincronizza"}
                    </Button>
                )}

                {isInstallable && (
                    <Button size="sm" variant="outline" onClick={installApp} className="h-7 rounded-lg border-blue-300 text-xs text-blue-600">
                        <Download className="mr-1 h-3 w-3" /> Installa App
                    </Button>
                )}

                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" type="button">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
