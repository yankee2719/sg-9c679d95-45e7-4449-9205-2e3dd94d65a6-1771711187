import { useMemo } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

export default function OfflinePage() {
    const { language } = useLanguage();
    const { membership } = useAuth();

    const userRole = membership?.role ?? "viewer";

    const text = useMemo(() => copy[language], [language]);

    return (
        <MainLayout userRole={userRole}>
            <div className="flex items-center justify-center min-h-[60vh] px-4">
                <Card className="bg-card border-border max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                            <WifiOff className="w-10 h-10 text-amber-400" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                {text.title}
                            </h1>
                            <p className="text-muted-foreground">
                                {text.description}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                {text.detail}
                            </p>

                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b]"
                            >
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