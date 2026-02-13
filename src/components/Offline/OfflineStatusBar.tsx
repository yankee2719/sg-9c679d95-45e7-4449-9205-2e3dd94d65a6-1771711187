// ============================================================================
// OFFLINE STATUS BAR COMPONENT
// ============================================================================
// File: src/components/Offline/OfflineStatusBar.tsx
// Barra superiore che mostra stato online/offline e pending sync
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface OfflineStatusBarProps {
    plantId: string;
    organizationId: string;
    userId: string;
}

export function OfflineStatusBar({ plantId, organizationId, userId }: OfflineStatusBarProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState < string | null > (null);
    const [syncResult, setSyncResult] = useState < { success: boolean; message: string } | null > (null);

    // -----------------------------------------------------------------------
    // MONITOR CONNECTION
    // -----------------------------------------------------------------------

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // -----------------------------------------------------------------------
    // MONITOR PENDING QUEUE
    // -----------------------------------------------------------------------

    const updatePendingCount = useCallback(() => {
        try {
            const raw = localStorage.getItem('offline_pending_queue');
            const queue = raw ? JSON.parse(raw) : [];
            const pending = queue.filter((i: any) => i.status === 'pending').length;
            setPendingCount(pending);
        } catch {
            setPendingCount(0);
        }
    }, []);

    useEffect(() => {
        updatePendingCount();
        const interval = setInterval(updatePendingCount, 5000);
        return () => clearInterval(interval);
    }, [updatePendingCount]);

    // Load last sync time
    useEffect(() => {
        const last = localStorage.getItem('offline_last_sync');
        setLastSync(last);
    }, []);

    // -----------------------------------------------------------------------
    // AUTO-SYNC WHEN COMING BACK ONLINE
    // -----------------------------------------------------------------------

    useEffect(() => {
        if (isOnline && pendingCount > 0) {
            handleSync();
        }
    }, [isOnline]);

    // -----------------------------------------------------------------------
    // SYNC HANDLER
    // -----------------------------------------------------------------------

    const handleSync = async () => {
        if (syncing || !isOnline) return;

        setSyncing(true);
        setSyncResult(null);

        try {
            const raw = localStorage.getItem('offline_pending_queue');
            const queue = raw ? JSON.parse(raw) : [];
            const pending = queue.filter((i: any) => i.status === 'pending');

            if (pending.length === 0) {
                setSyncResult({ success: true, message: 'Nothing to sync' });
                return;
            }

            const res = await fetch('/api/sync', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operations: pending,
                    plant_id: plantId,
                    device_id: localStorage.getItem('offline_device_id'),
                }),
            });

            if (!res.ok) throw new Error('Sync request failed');

            const { summary } = await res.json();

            // Remove synced items from local queue
            const remaining = queue.filter((i: any) => {
                if (i.status !== 'pending') return true;
                return false;
            });
            localStorage.setItem('offline_pending_queue', JSON.stringify(remaining));

            const now = new Date().toISOString();
            localStorage.setItem('offline_last_sync', now);
            setLastSync(now);

            updatePendingCount();
            setSyncResult({
                success: summary.failed === 0,
                message: `Synced ${summary.synced}/${summary.total} operations`,
            });

        } catch (error) {
            setSyncResult({ success: false, message: 'Sync failed - will retry' });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 4000);
        }
    };

    // -----------------------------------------------------------------------
    // RENDER: Only show when offline OR there are pending items
    // -----------------------------------------------------------------------

    if (isOnline && pendingCount === 0 && !syncResult) return null;

    return (
        <div className={`w-full px-4 py-2 flex items-center justify-between text-sm transition-all
      ${isOnline ? 'bg-blue-50 border-b border-blue-200' : 'bg-orange-50 border-b border-orange-300'}`}
        >
            {/* Status */}
            <div className="flex items-center gap-3">
                {isOnline ? (
                    <Wifi className="h-4 w-4 text-blue-600" />
                ) : (
                    <WifiOff className="h-4 w-4 text-orange-600" />
                )}

                <span className={isOnline ? 'text-blue-700' : 'text-orange-700 font-medium'}>
                    {isOnline ? 'Online' : 'Working Offline'}
                </span>

                {pendingCount > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-400 bg-orange-100">
                        {pendingCount} pending
                    </Badge>
                )}

                {syncResult && (
                    <div className={`flex items-center gap-1 ${syncResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {syncResult.success
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <AlertCircle className="h-4 w-4" />
                        }
                        <span>{syncResult.message}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                {lastSync && (
                    <span className="text-gray-500 text-xs">
                        Last sync: {new Date(lastSync).toLocaleTimeString()}
                    </span>
                )}

                {isOnline && pendingCount > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSync}
                        disabled={syncing}
                        className="h-7 text-xs"
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                )}
            </div>
        </div>
    );
}

