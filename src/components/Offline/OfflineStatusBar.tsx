import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Download, X } from 'lucide-react';
import { usePWA } from '@/contexts/PWAProvider';
import { authService } from '@/services/authService';
import {
    getOfflineSyncCount,
    getOfflineSyncLastRun,
    listOfflineSyncOperations,
    removeOfflineSyncOperations,
    setOfflineSyncLastRun,
} from '@/lib/offlineOpsQueue';

export function OfflineStatusBar() {
    const { isOnline, isInstallable, installApp } = usePWA();
    const [pendingMutations, setPendingMutations] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState < { ok: boolean; msg: string } | null > (null);
    const [lastSync, setLastSync] = useState < string | null > (null);
    const [dismissed, setDismissed] = useState(false);

    const refreshPendingCount = useCallback(() => {
        setPendingMutations(getOfflineSyncCount());
        setLastSync(getOfflineSyncLastRun());
    }, []);

    useEffect(() => {
        refreshPendingCount();
        const iv = setInterval(refreshPendingCount, 4000);
        return () => clearInterval(iv);
    }, [refreshPendingCount]);

    useEffect(() => {
        if (isOnline && pendingMutations > 0 && !syncing) {
            void handleSync();
        }
    }, [isOnline, pendingMutations, syncing]);

    const handleSync = async () => {
        if (syncing || !isOnline) return;
        setSyncing(true);
        setSyncResult(null);

        try {
            const operations = listOfflineSyncOperations();
            if (operations.length === 0) {
                setSyncResult({ ok: true, msg: 'Nessuna operazione in coda' });
                return;
            }

            const session = await authService.getCurrentSession();
            if (!session?.access_token) {
                setSyncResult({ ok: false, msg: 'Accesso richiesto per sincronizzare' });
                return;
            }

            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    operations,
                    plant_id: operations.find((item) => item.plant_id)?.plant_id ?? null,
                    device_id: null,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Sincronizzazione fallita');
            }

            const syncedIds = Array.isArray(payload?.results)
                ? payload.results.filter((row: any) => row.status === 'synced').map((row: any) => row.id)
                : [];

            removeOfflineSyncOperations(syncedIds);
            const now = new Date().toISOString();
            setOfflineSyncLastRun(now);
            setLastSync(now);
            refreshPendingCount();

            const summary = payload?.summary ?? {};
            const synced = Number(summary.synced ?? syncedIds.length ?? 0);
            const failed = Number(summary.failed ?? 0);
            const conflicts = Number(summary.conflicts ?? 0);
            setSyncResult({
                ok: failed === 0 && conflicts === 0,
                msg:
                    failed === 0 && conflicts === 0
                        ? `${synced} operazioni sincronizzate`
                        : `${synced} sincronizzate, ${failed + conflicts} non riuscite`,
            });
        } catch (err: any) {
            setSyncResult({ ok: false, msg: err?.message || 'Sincronizzazione fallita' });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 4000);
        }
    };

    const shouldShow = !isOnline || pendingMutations > 0 || syncResult || isInstallable;
    if (!shouldShow || dismissed) return null;

    return (
        <div className={`z-50 flex w-full items-center justify-between px-4 py-2 text-sm transition-all ${isOnline
                ? 'border-b border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10'
                : 'border-b border-amber-300 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
            }`}>
            <div className="flex flex-wrap items-center gap-3">
                {isOnline ? (
                    <Wifi className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                ) : (
                    <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}

                <span className={isOnline ? 'text-blue-700 dark:text-blue-300' : 'font-medium text-amber-700 dark:text-amber-300'}>
                    {isOnline ? 'Online' : 'Offline — modifiche salvate in coda locale'}
                </span>

                {pendingMutations > 0 && (
                    <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        {pendingMutations} in attesa
                    </Badge>
                )}

                {syncResult && (
                    <div className={`flex items-center gap-1 ${syncResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                        {syncResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        <span className="text-xs">{syncResult.msg}</span>
                    </div>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {lastSync && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                        Sync: {new Date(lastSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}

                {isOnline && pendingMutations > 0 && (
                    <Button size="sm" variant="outline" onClick={() => void handleSync()} disabled={syncing} className="h-7 rounded-lg text-xs">
                        <RefreshCw className={`mr-1 h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sync...' : 'Sincronizza'}
                    </Button>
                )}

                {isInstallable && (
                    <Button size="sm" variant="outline" onClick={installApp} className="h-7 rounded-lg border-blue-300 text-xs text-blue-600">
                        <Download className="mr-1 h-3 w-3" /> Installa App
                    </Button>
                )}

                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

