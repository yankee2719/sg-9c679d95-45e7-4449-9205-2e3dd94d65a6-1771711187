import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    HardDrive,
    Loader2,
    RefreshCw,
    Trash2,
    Wifi,
    WifiOff,
    Wrench,
} from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/services/apiClient";
import {
    clearOfflineSyncHistory,
    clearOfflineSyncQueue,
    getOfflineSyncLastRun,
    listOfflineSyncHistory,
    listOfflineSyncOperations,
    type OfflineSyncHistoryEntry,
    type OfflineSyncOperation,
} from "@/lib/offlineOpsQueue";
import { runOfflineSync } from "@/lib/offlineSyncClient";
import {
    downloadCachedDocument,
    listCachedDocumentEntries,
    openCachedDocument,
    removeCachedDocument,
    type CachedDocumentEntry,
} from "@/lib/offlineDocumentCache";
import {
    listEquipmentSnapshots,
    removeEquipmentSnapshot,
    type EquipmentSnapshot,
} from "@/lib/equipmentSnapshotCache";

interface ServerSyncSession {
    id: string;
    plant_id: string | null;
    device_id: string | null;
    operations_synced: number | null;
    operations_failed: number | null;
    conflicts_detected: number | null;
    status: string | null;
    completed_at: string | null;
    created_at?: string | null;
}

const copy: Record<Language, any> = {
    it: {
        title: "Centro offline",
        subtitle: "Controlla coda sync, documenti salvati e snapshot macchina disponibili sul dispositivo.",
        syncNow: "Sincronizza ora",
        queueEmpty: "Nessuna operazione in coda.",
        docsEmpty: "Nessun documento salvato offline.",
        machinesEmpty: "Nessuna snapshot macchina disponibile.",
        historyEmpty: "Nessuno storico sync locale.",
        serverHistoryEmpty: "Nessuna sessione sync server trovata.",
        clearQueue: "Svuota coda",
        clearHistory: "Pulisci storico",
        open: "Apri",
        remove: "Rimuovi",
        download: "Scarica",
        offlineReady: "Disponibile offline",
        localHistory: "Storico sync locale",
        serverHistory: "Storico sync server",
        queue: "Operazioni in coda",
        documents: "Documenti offline",
        machines: "Snapshot macchine",
        lastSync: "Ultimo sync",
        never: "Mai",
        savedAt: "Salvato",
        generatedAt: "Generata",
        pending: "In attesa",
        synced: "Sincronizzate",
        failed: "Fallite",
        conflicts: "Conflitti",
        online: "Online",
        offline: "Offline",
        queueCard: "Coda sync",
        docsCard: "Documenti",
        machinesCard: "Macchine",
        refresh: "Aggiorna",
    },
    en: {
        title: "Offline center",
        subtitle: "Review sync queue, saved documents and machine snapshots available on this device.",
        syncNow: "Sync now",
        queueEmpty: "No queued operations.",
        docsEmpty: "No offline documents saved.",
        machinesEmpty: "No machine snapshots available.",
        historyEmpty: "No local sync history.",
        serverHistoryEmpty: "No server sync sessions found.",
        clearQueue: "Clear queue",
        clearHistory: "Clear history",
        open: "Open",
        remove: "Remove",
        download: "Download",
        offlineReady: "Offline ready",
        localHistory: "Local sync history",
        serverHistory: "Server sync history",
        queue: "Queued operations",
        documents: "Offline documents",
        machines: "Machine snapshots",
        lastSync: "Last sync",
        never: "Never",
        savedAt: "Saved",
        generatedAt: "Generated",
        pending: "Pending",
        synced: "Synced",
        failed: "Failed",
        conflicts: "Conflicts",
        online: "Online",
        offline: "Offline",
        queueCard: "Sync queue",
        docsCard: "Documents",
        machinesCard: "Machines",
        refresh: "Refresh",
    },
    fr: {
        title: "Centre hors ligne",
        subtitle: "Contrôlez la file de synchro, les documents enregistrés et les snapshots machine disponibles sur l’appareil.",
        syncNow: "Synchroniser",
        queueEmpty: "Aucune opération en file.",
        docsEmpty: "Aucun document hors ligne.",
        machinesEmpty: "Aucun snapshot machine disponible.",
        historyEmpty: "Aucun historique local.",
        serverHistoryEmpty: "Aucune session serveur trouvée.",
        clearQueue: "Vider la file",
        clearHistory: "Effacer l’historique",
        open: "Ouvrir",
        remove: "Supprimer",
        download: "Télécharger",
        offlineReady: "Disponible hors ligne",
        localHistory: "Historique local",
        serverHistory: "Historique serveur",
        queue: "Opérations en file",
        documents: "Documents hors ligne",
        machines: "Snapshots machine",
        lastSync: "Dernière synchro",
        never: "Jamais",
        savedAt: "Enregistré",
        generatedAt: "Généré",
        pending: "En attente",
        synced: "Synchronisées",
        failed: "Échouées",
        conflicts: "Conflits",
        online: "En ligne",
        offline: "Hors ligne",
        queueCard: "File synchro",
        docsCard: "Documents",
        machinesCard: "Machines",
        refresh: "Actualiser",
    },
    es: {
        title: "Centro offline",
        subtitle: "Controla la cola de sincronización, los documentos guardados y las snapshots de máquina disponibles en este dispositivo.",
        syncNow: "Sincronizar ahora",
        queueEmpty: "No hay operaciones en cola.",
        docsEmpty: "No hay documentos guardados offline.",
        machinesEmpty: "No hay snapshots de máquina disponibles.",
        historyEmpty: "No hay historial local.",
        serverHistoryEmpty: "No se encontraron sesiones del servidor.",
        clearQueue: "Vaciar cola",
        clearHistory: "Limpiar historial",
        open: "Abrir",
        remove: "Quitar",
        download: "Descargar",
        offlineReady: "Disponible offline",
        localHistory: "Historial local",
        serverHistory: "Historial servidor",
        queue: "Operaciones en cola",
        documents: "Documentos offline",
        machines: "Snapshots de máquina",
        lastSync: "Última sincronización",
        never: "Nunca",
        savedAt: "Guardado",
        generatedAt: "Generada",
        pending: "Pendientes",
        synced: "Sincronizadas",
        failed: "Fallidas",
        conflicts: "Conflictos",
        online: "Online",
        offline: "Offline",
        queueCard: "Cola sync",
        docsCard: "Documentos",
        machinesCard: "Máquinas",
        refresh: "Actualizar",
    },
};

function formatDate(value: string | null | undefined, language: Language) {
    if (!value) return "-";
    try {
        return new Date(value).toLocaleString(language === "it" ? "it-IT" : language);
    } catch {
        return value;
    }
}

function getQueueLabel(operation: OfflineSyncOperation) {
    if (operation.entity_type === "checklist_execution_complete") {
        return `Checklist completata • WO ${operation.payload?.work_order_id || operation.entity_id}`;
    }
    return operation.entity_type;
}

export default function OfflinePage() {
    const { toast } = useToast();
    const { language } = useLanguage();
    const { membership } = useAuth();
    const userRole = membership?.role ?? "viewer";
    const text = useMemo(() => copy[language], [language]);

    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [queue, setQueue] = useState<OfflineSyncOperation[]>([]);
    const [localHistory, setLocalHistory] = useState<OfflineSyncHistoryEntry[]>([]);
    const [documents, setDocuments] = useState<CachedDocumentEntry[]>([]);
    const [snapshots, setSnapshots] = useState<EquipmentSnapshot[]>([]);
    const [serverHistory, setServerHistory] = useState<ServerSyncSession[]>([]);
    const [serverHistoryLoading, setServerHistoryLoading] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const refreshLocalState = () => {
        setQueue(listOfflineSyncOperations());
        setLocalHistory(listOfflineSyncHistory());
        setDocuments(listCachedDocumentEntries());
        setSnapshots(listEquipmentSnapshots());
        setLastSync(getOfflineSyncLastRun());
        setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    };

    const loadServerHistory = async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setServerHistory([]);
            return;
        }

        setServerHistoryLoading(true);
        try {
            const payload = await apiFetch<{ sessions: ServerSyncSession[] }>("/api/sync/history?limit=12");
            setServerHistory(Array.isArray(payload?.sessions) ? payload.sessions : []);
        } catch {
            setServerHistory([]);
        } finally {
            setServerHistoryLoading(false);
        }
    };

    useEffect(() => {
        refreshLocalState();
        void loadServerHistory();

        const handleOnline = () => {
            refreshLocalState();
            void loadServerHistory();
        };
        const handleOffline = () => refreshLocalState();

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await runOfflineSync();
            toast({
                title: result.ok ? "Sync completato" : "Sync con errori",
                description: result.message,
            });
            refreshLocalState();
            if (navigator.onLine) {
                await loadServerHistory();
            }
        } catch (error: any) {
            toast({
                title: "Errore sync",
                description: error?.message || "Sincronizzazione fallita",
                variant: "destructive",
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleRemoveDocument = async (documentId: string) => {
        try {
            await removeCachedDocument(documentId);
            refreshLocalState();
        } catch (error: any) {
            toast({ title: "Errore", description: error?.message || "Rimozione fallita", variant: "destructive" });
        }
    };

    const handleRemoveSnapshot = (machineId: string) => {
        removeEquipmentSnapshot(machineId);
        refreshLocalState();
    };

    const handleClearQueue = () => {
        if (!window.confirm("Svuotare la coda offline locale?")) return;
        clearOfflineSyncQueue();
        refreshLocalState();
    };

    const handleClearHistory = () => {
        if (!window.confirm("Pulire lo storico locale dei tentativi di sync?")) return;
        clearOfflineSyncHistory();
        refreshLocalState();
    };

    return (
        <MainLayout userRole={userRole}>
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-6 w-6 text-orange-500" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{text.title}</h1>
                            <Badge variant="outline" className={isOnline ? "text-blue-600" : "text-amber-600"}>
                                {isOnline ? text.online : text.offline}
                            </Badge>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{text.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => { refreshLocalState(); void loadServerHistory(); }}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {text.refresh}
                        </Button>
                        <Button onClick={() => void handleSync()} disabled={syncing || (!isOnline && queue.length === 0)}>
                            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            {text.syncNow}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{text.queueCard}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{queue.length}</div>
                            <p className="text-xs text-muted-foreground">{text.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{text.docsCard}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{documents.length}</div>
                            <p className="text-xs text-muted-foreground">{text.offlineReady}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{text.machinesCard}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{snapshots.length}</div>
                            <p className="text-xs text-muted-foreground">{text.offlineReady}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">{text.lastSync}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-semibold">{lastSync ? formatDate(lastSync, language) : text.never}</div>
                            <p className="text-xs text-muted-foreground">{text.lastSync}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>{text.queue}</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleClearQueue} disabled={queue.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {text.clearQueue}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {queue.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{text.queueEmpty}</p>
                            ) : (
                                queue.map((item) => (
                                    <div key={item.id} className="rounded-xl border border-border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-medium text-foreground">{getQueueLabel(item)}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.client_timestamp, language)}</div>
                                            </div>
                                            <Badge variant="outline">#{item.sequence_number}</Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>{text.localHistory}</CardTitle>
                            <Button variant="outline" size="sm" onClick={handleClearHistory} disabled={localHistory.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {text.clearHistory}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {localHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{text.historyEmpty}</p>
                            ) : (
                                localHistory.map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 font-medium">
                                                    {entry.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                                                    <span>{entry.message}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">{formatDate(entry.created_at, language)}</div>
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                <div>{text.synced}: {entry.synced}</div>
                                                <div>{text.failed}: {entry.failed}</div>
                                                <div>{text.conflicts}: {entry.conflicts}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{text.documents}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {documents.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{text.docsEmpty}</p>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.id} className="rounded-xl border border-border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-orange-500" />
                                                    <span className="truncate font-medium">{doc.title}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {text.savedAt}: {formatDate(doc.savedAt, language)}
                                                </div>
                                                {doc.machineId && (
                                                    <Link href={`/equipment/${doc.machineId}`} className="mt-1 block text-xs text-orange-600 hover:underline">
                                                        {doc.machineLabel || "Macchina collegata"}
                                                    </Link>
                                                )}
                                            </div>
                                            <Badge variant="outline">{text.offlineReady}</Badge>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" onClick={() => void openCachedDocument(doc.id)}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                {text.open}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => void downloadCachedDocument(doc.id)}>
                                                <Download className="mr-2 h-4 w-4" />
                                                {text.download}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => void handleRemoveDocument(doc.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {text.remove}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{text.machines}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {snapshots.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{text.machinesEmpty}</p>
                            ) : (
                                snapshots.map((snapshot) => (
                                    <div key={snapshot.machine.id} className="rounded-xl border border-border p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Wrench className="h-4 w-4 text-orange-500" />
                                                    <span className="truncate font-medium">{snapshot.machine.name || snapshot.machine.internal_code || snapshot.machine.id}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {text.generatedAt}: {formatDate(snapshot.generatedAt, language)}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {snapshot.plant?.name || "-"} • {snapshot.documents?.length || 0} docs • {snapshot.workOrders?.length || 0} WO
                                                </div>
                                            </div>
                                            <Badge variant="outline">{text.offlineReady}</Badge>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/equipment/${snapshot.machine.id}?offline=1`}>{text.open}</Link>
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleRemoveSnapshot(snapshot.machine.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {text.remove}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>{text.serverHistory}</CardTitle>
                        {serverHistoryLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {!isOnline ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <WifiOff className="h-4 w-4" />
                                <span>{text.offline}</span>
                            </div>
                        ) : serverHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{text.serverHistoryEmpty}</p>
                        ) : (
                            serverHistory.map((session) => (
                                <div key={session.id} className="rounded-xl border border-border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 font-medium">
                                                {(session.operations_failed || 0) > 0 || (session.conflicts_detected || 0) > 0 ? (
                                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                                ) : (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                )}
                                                <span>{session.status || "completed"}</span>
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(session.completed_at || session.created_at, language)}
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            <div>{text.synced}: {session.operations_synced || 0}</div>
                                            <div>{text.failed}: {session.operations_failed || 0}</div>
                                            <div>{text.conflicts}: {session.conflicts_detected || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
