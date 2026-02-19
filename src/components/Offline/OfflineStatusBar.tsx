// src/components/Offline/OfflineStatusBar.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Download, X } from 'lucide-react';
import { usePWA } from '@/contexts/PWAProvider';

export function OfflineStatusBar() {
    const { isOnline, isInstallable, pendingSync, installApp } = usePWA();
    const [pendingMutations, setPendingMutations] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState < { ok: boolean; msg: string } | null > (null);
    const [lastSync, setLastSync] = useState < string | null > (null);
    const [dismissed, setDismissed] = useState(false);

    // Count queued mutations in IndexedDB
    const countMutations = useCallback(async () => {
        try {
            const db = await openDB();
            const tx = db.transaction('mutations', 'readonly');
            const store = tx.objectStore('mutations');
            const countReq = store.count();
            countReq.onsuccess = () => setPendingMutations(countReq.result);
        } catch {
            // IndexedDB not ready or no mutations store
            setPendingMutations(0);
        }
    }, []);

    useEffect(() => {
        countMutations();
        const iv = setInterval(countMutations, 5000);
        setLastSync(localStorage.getItem('offline_last_sync'));
        return () => clearInterval(iv);
    }, [countMutations]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && pendingMutations > 0 && !syncing) {
            handleSync();
        }
    }, [isOnline]);

    const handleSync = async () => {
        if (syncing || !isOnline) return;
        setSyncing(true);
        setSyncResult(null);

        try {
            const db = await openDB();
            const tx = db.transaction('mutations', 'readwrite');
            const store = tx.objectStore('mutations');

            const allReq = store.getAll();
            await new Promise < void> ((resolve, reject) => {
                allReq.onsuccess = async () => {
                    const mutations = allReq.result || [];
                    let synced = 0;
                    let failed = 0;

                    for (const m of mutations) {
                        try {
                            await fetch(m.url, {
                                method: m.method,
                                headers: m.headers,
                                body: m.body,
                            });
                            // Remove from IDB
                            const delTx = db.transaction('mutations', 'readwrite');
                            delTx.objectStore('mutations').delete(m.id);
                            synced++;
                        } catch {
                            failed++;
                        }
                    }

                    const now = new Date().toISOString();
                    localStorage.setItem('offline_last_sync', now);
                    setLastSync(now);
                    await countMutations();

                    setSyncResult({
                        ok: failed === 0,
                        msg: failed === 0
                            ? `${synced} operazioni sincronizzate`
                            : `${synced} sincronizzate, ${failed} fallite`,
                    });
                    resolve();
                };
                allReq.onerror = () => reject(allReq.error);
            });
        } catch (err) {
            setSyncResult({ ok: false, msg: 'Sincronizzazione fallita' });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 4000);
        }
    };

    // Don't show if online with nothing pending and no install prompt
    const shouldShow = !isOnline || pendingMutations > 0 || syncResult || isInstallable;
    if (!shouldShow || dismissed) return null;

    return (
        <div className={`w-full px-4 py-2 flex items-center justify-between text-sm transition-all z-50
            ${isOnline
                ? 'bg-blue-50 dark:bg-blue-500/10 border-b border-blue-200 dark:border-blue-500/20'
                : 'bg-amber-50 dark:bg-amber-500/10 border-b border-amber-300 dark:border-amber-500/20'}`}
        >
            <div className="flex items-center gap-3 flex-wrap">
                {isOnline
                    ? <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    : <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                }

                <span className={isOnline ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300 font-medium'}>
                    {isOnline ? 'Online' : 'Offline — modifiche salvate in locale'}
                </span>

                {pendingMutations > 0 && (
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-400 bg-amber-100 dark:bg-amber-500/20">
                        {pendingMutations} in attesa
                    </Badge>
                )}

                {syncResult && (
                    <div className={`flex items-center gap-1 ${syncResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                        {syncResult.ok
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <AlertCircle className="h-4 w-4" />
                        }
                        <span className="text-xs">{syncResult.msg}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {lastSync && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Sync: {new Date(lastSync).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}

                {isOnline && pendingMutations > 0 && (
                    <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}
                        className="h-7 text-xs rounded-lg">
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Sync...' : 'Sincronizza'}
                    </Button>
                )}

                {isInstallable && (
                    <Button size="sm" variant="outline" onClick={installApp}
                        className="h-7 text-xs rounded-lg text-blue-600 border-blue-300">
                        <Download className="h-3 w-3 mr-1" /> Installa App
                    </Button>
                )}

                <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

// Open IndexedDB (same DB as service worker)
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('maintops-offline', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('mutations')) {
                db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

