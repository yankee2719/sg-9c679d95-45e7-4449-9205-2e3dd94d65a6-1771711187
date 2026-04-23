import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Wifi, WifiOff, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/contexts/PWAProvider";
import { getLegacyMutationCount, getOfflineOperationCount } from "@/lib/offlineOpsQueue";
import { runOfflineSync } from "@/lib/offlineSyncClient";

export function OfflineStatusBar() {
    const { isOnline, isInstallable, installApp } = usePWA();
    const [pendingOps, setPendingOps] = useState(0);
    const [legacyMutations, setLegacyMutations] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setPendingOps(getOfflineOperationCount());
        setLegacyMutations(await getLegacyMutationCount());
    }, []);

    useEffect(() => {
        refresh();
        const interval = window.setInterval(refresh, 5000);
        return () => window.clearInterval(interval);
    }, [refresh]);

    const handleSync = async () => {
        if (syncing || !isOnline) return;
        setSyncing(true);
        setSyncMessage(null);
        try {
            const summary = await runOfflineSync();
            setSyncMessage(
                summary.failed === 0 && summary.conflicts === 0
                    ? `${summary.synced} sincronizzate`
                    : `${summary.synced} ok · ${summary.failed} fallite · ${summary.conflicts} conflitti`
            );
            await refresh();
        } catch (error) {
            setSyncMessage(error instanceof Error ? error.message : "Sync fallita");
        } finally {
            setSyncing(false);
            window.setTimeout(() => setSyncMessage(null), 4000);
        }
    };

    const shouldShow = !dismissed && (!isOnline || pendingOps > 0 || legacyMutations > 0 || isInstallable || !!syncMessage);
    if (!shouldShow) return null;

    return (
        <div className={`w-full px-4 py-2 border-b flex items-center justify-between gap-3 text-sm ${isOnline ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-300"
            }`}>
            <div className="flex items-center gap-3 flex-wrap min-w-0">
                {isOnline ? <Wifi className="h-4 w-4 text-blue-600" /> : <WifiOff className="h-4 w-4 text-amber-700" />}
                <span className={isOnline ? "text-blue-700" : "text-amber-800 font-medium"}>
                    {isOnline ? "Online" : "Offline — uso locale attivo"}
                </span>

                {pendingOps > 0 && <Badge variant="outline">{pendingOps} operazioni in coda</Badge>}
                {legacyMutations > 0 && (
                    <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {legacyMutations} mutazioni legacy da pulire
                    </Badge>
                )}
                {syncMessage && <span className="text-xs text-muted-foreground">{syncMessage}</span>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Link href="/offline" className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground">
                    Centro offline
                </Link>

                {isOnline && pendingOps > 0 && (
                    <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-7 text-xs">
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Sync..." : "Sincronizza"}
                    </Button>
                )}

                {isInstallable && (
                    <Button size="sm" variant="outline" onClick={installApp} className="h-7 text-xs">
                        <Download className="h-3 w-3 mr-1" />
                        Installa
                    </Button>
                )}

                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
