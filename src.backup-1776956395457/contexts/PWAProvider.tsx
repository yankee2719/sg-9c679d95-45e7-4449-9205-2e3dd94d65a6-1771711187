import { useEffect, useRef, useState, createContext, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import { getOfflineOperationCount, OFFLINE_QUEUE_UPDATED_EVENT } from "@/lib/offlineOpsQueue";
import { runOfflineSync } from "@/lib/offlineSyncClient";

interface PWAContextType {
    isOnline: boolean;
    isInstallable: boolean;
    pendingSync: number;
    installApp: () => void;
}

const PWAContext = createContext < PWAContextType > ({
    isOnline: true,
    isInstallable: false,
    pendingSync: 0,
    installApp: () => { },
});

export const usePWA = () => useContext(PWAContext);

function getInitialOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOnline, setIsOnline] = useState < boolean > (getInitialOnline);
    const [isInstallable, setIsInstallable] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState < any > (null);
    const isSyncingRef = useRef(false);

    useEffect(() => {
        const refreshPendingSync = () => {
            setPendingSync(getOfflineOperationCount());
        };

        async function syncNow() {
            if (isSyncingRef.current) return;
            if (!navigator.onLine) return;
            const currentPending = getOfflineOperationCount();
            setPendingSync(currentPending);
            if (currentPending === 0) return;

            isSyncingRef.current = true;
            try {
                const summary = await runOfflineSync();
                setPendingSync(getOfflineOperationCount());

                if (summary.total > 0) {
                    toast({
                        title: summary.failed === 0 && summary.conflicts === 0 ? "Sincronizzazione completata" : "Sincronizzazione completata con errori",
                        description:
                            summary.failed === 0 && summary.conflicts === 0
                                ? `${summary.synced} operazioni offline sincronizzate.`
                                : `${summary.synced} sincronizzate, ${summary.failed} fallite, ${summary.conflicts} conflitti.`,
                        variant: summary.failed === 0 && summary.conflicts === 0 ? "default" : "destructive",
                    });
                }
            } catch (error) {
                console.error("[PWA] Offline sync failed:", error);
                setPendingSync(getOfflineOperationCount());
                toast({
                    title: "Sincronizzazione offline fallita",
                    description: error instanceof Error ? error.message : "Impossibile sincronizzare le operazioni offline.",
                    variant: "destructive",
                });
            } finally {
                isSyncingRef.current = false;
            }
        }

        refreshPendingSync();

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[PWA] Service Worker registered:", registration.scope);
                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (newWorker.state === "activated") {
                                    toast({
                                        title: "App aggiornata",
                                        description: "Nuova versione disponibile. Ricarica per aggiornare.",
                                    });
                                }
                            });
                        }
                    });
                })
                .catch((err) => {
                    console.error("[PWA] SW registration failed:", err);
                });
        }

        const handleOnline = () => {
            setIsOnline(true);
            toast({
                title: "Sei online",
                description: "Connessione ripristinata. Verifico le operazioni offline in coda.",
            });
            void syncNow();
        };

        const handleOffline = () => {
            setIsOnline(false);
            refreshPendingSync();
            toast({
                title: "Sei offline",
                description: "Le operazioni verranno messe in coda e sincronizzate quando torni online.",
                variant: "destructive",
            });
        };

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key.startsWith("machina.offline.")) {
                refreshPendingSync();
            }
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        window.addEventListener("storage", handleStorage);
        window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, refreshPendingSync as EventListener);

        if (navigator.onLine) {
            void syncNow();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, refreshPendingSync as EventListener);
        };
    }, [toast]);

    const installApp = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

    return (
        <PWAContext.Provider value={{ isOnline, isInstallable, pendingSync, installApp }}>
            {children}
        </PWAContext.Provider>
    );
}

