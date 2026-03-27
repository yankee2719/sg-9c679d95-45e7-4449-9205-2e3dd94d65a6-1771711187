import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, WifiOff } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
    clearLegacyMutations,
    clearOfflineOperations,
    clearSyncHistory,
    getLegacyMutationCount,
    listOfflineOperations,
    listSyncHistory,
    type OfflineSyncHistoryEntry,
} from "@/lib/offlineOpsQueue";
import { runOfflineSync } from "@/lib/offlineSyncClient";

export default function OfflinePage() {
    const { membership } = useAuth();
    const userRole = membership?.role ?? "viewer";
    const [pendingOps, setPendingOps] = useState(listOfflineOperations());
    const [syncHistory, setSyncHistory] = useState < OfflineSyncHistoryEntry[] > ([]);
    const [legacyCount, setLegacyCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    const refresh = useCallback(async () => {
        setPendingOps(listOfflineOperations());
        setSyncHistory(listSyncHistory());
        setLegacyCount(await getLegacyMutationCount());
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const summary = useMemo(() => ({
        queue: pendingOps.length,
        legacy: legacyCount,
        lastSync: syncHistory[0]?.created_at ?? null,
    }), [legacyCount, pendingOps.length, syncHistory]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await runOfflineSync();
            await refresh();
        } finally {
            setSyncing(false);
        }
    };

    return (
        <MainLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">Centro offline</h1>
                        <p className="text-muted-foreground">
                            Stato coda, storico sync e pulizia residui legacy prima del rilascio.
                        </p>
                    </div>
                    <Button onClick={handleSync} disabled={syncing || pendingOps.length === 0}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Sincronizzazione..." : "Sincronizza ora"}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader><CardTitle>Operazioni in coda</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{summary.queue}</div>
                            <p className="text-sm text-muted-foreground">Operazioni applicative salvate localmente.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Mutazioni legacy</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-600">{summary.legacy}</div>
                            <p className="text-sm text-muted-foreground">Residui della vecchia coda raw del service worker.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Ultimo sync</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium">
                                {summary.lastSync ? new Date(summary.lastSync).toLocaleString("it-IT") : "Mai eseguito"}
                            </div>
                            <p className="text-sm text-muted-foreground">Storico locale delle ultime sincronizzazioni.</p>
                        </CardContent>
                    </Card>
                </div>

                {legacyCount > 0 && (
                    <Card className="border-amber-300 bg-amber-50">
                        <CardContent className="pt-6 flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5" />
                                <div>
                                    <h2 className="font-semibold text-amber-900">Coda legacy rilevata</h2>
                                    <p className="text-sm text-amber-800">
                                        Nel browser ci sono ancora mutazioni raw del vecchio service worker. Non vanno rilanciate automaticamente in produzione.
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={async () => { await clearLegacyMutations(); await refresh(); }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Svuota legacy queue
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Operazioni pending</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => { clearOfflineOperations(); refresh(); }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Svuota
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {pendingOps.length === 0 ? (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <WifiOff className="h-4 w-4" />
                                    Nessuna operazione in coda.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingOps.map((operation) => (
                                        <div key={operation.id} className="rounded-lg border p-3 text-sm">
                                            <div className="font-medium">{operation.entity_type} · {operation.operation_type}</div>
                                            <div className="text-muted-foreground">Entity: {operation.entity_id}</div>
                                            <div className="text-muted-foreground">{new Date(operation.client_timestamp).toLocaleString("it-IT")}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Storico sync locale</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => { clearSyncHistory(); refresh(); }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Pulisci
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {syncHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nessuna sincronizzazione registrata.</p>
                            ) : (
                                <div className="space-y-3">
                                    {syncHistory.map((entry) => (
                                        <div key={entry.id} className="rounded-lg border p-3 text-sm">
                                            <div className="font-medium">{entry.ok ? "Sync completata" : "Sync con errori"}</div>
                                            <div className="text-muted-foreground">{new Date(entry.created_at).toLocaleString("it-IT")}</div>
                                            <div className="text-muted-foreground">{entry.message}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
