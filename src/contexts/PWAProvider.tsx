import { useEffect, useState, createContext, useContext } from "react";
import { useToast } from "@/hooks/use-toast";

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

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOnline, setIsOnline] = useState(true);
    const [isInstallable, setIsInstallable] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const [deferredPrompt, setDeferredPrompt] = useState < any > (null);

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        // Register Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("[PWA] Service Worker registered:", registration.scope);

                    // Listen for updates
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

            // Listen for sync complete messages from SW
            navigator.serviceWorker.addEventListener("message", (event) => {
                if (event.data?.type === "SYNC_COMPLETE") {
                    toast({
                        title: "Sincronizzazione completata",
                        description: "Le operazioni offline sono state sincronizzate.",
                    });
                    setPendingSync(0);
                }
            });
        }

        // Online/Offline handlers
        const handleOnline = () => {
            setIsOnline(true);
            toast({
                title: "Sei online",
                description: "Connessione ripristinata. Sincronizzazione in corso...",
            });

            // Trigger sync of queued mutations
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: "SYNC_OFFLINE" });
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast({
                title: "Sei offline",
                description: "Le operazioni verranno salvate e sincronizzate quando torni online.",
                variant: "destructive",
            });
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // PWA install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        };
    }, []);

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

            {/* Offline indicator bar */}
            {!isOnline && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-600 text-white text-center py-2 text-sm font-medium">
                    ⚠️ Sei offline — Le modifiche verranno sincronizzate automaticamente
                </div>
            )}
        </PWAContext.Provider>
    );
}
