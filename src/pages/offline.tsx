import { useMemo } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        title: "Sei offline",
        description: "Non è possibile raggiungere il server. Le pagine recenti restano disponibili dalla cache.",
        detail: "Le operazioni eseguite offline verranno sincronizzate automaticamente quando torni online.",
        retry: "Riprova",
    },
    en: {
        title: "You are offline",
        description: "The server cannot be reached. Recently visited pages remain available from cache.",
        detail: "Operations performed offline will sync automatically when you are back online.",
        retry: "Retry",
    },
    fr: {
        title: "Vous êtes hors ligne",
        description: "Impossible de joindre le serveur. Les pages récentes restent disponibles depuis le cache.",
        detail: "Les opérations effectuées hors ligne seront synchronisées automatiquement au retour de la connexion.",
        retry: "Réessayer",
    },
    es: {
        title: "Estás sin conexión",
        description: "No es posible llegar al servidor. Las páginas recientes siguen disponibles desde la caché.",
        detail: "Las operaciones realizadas offline se sincronizarán automáticamente cuando vuelvas a estar online.",
        retry: "Reintentar",
    },
} as const;

export default function OfflinePage() {
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh] px-4">
                <Card className="bg-card border-border max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                            <WifiOff className="w-10 h-10 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">{text.title}</h1>
                            <p className="text-muted-foreground">{text.description}</p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">{text.detail}</p>
                            <Button onClick={() => window.location.reload()} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-foreground">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                {text.retry}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
