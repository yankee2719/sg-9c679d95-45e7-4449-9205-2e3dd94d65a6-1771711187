import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                            <WifiOff className="w-10 h-10 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">Sei Offline</h1>
                            <p className="text-slate-400">
                                Non è possibile raggiungere il server. Le pagine visitate di recente sono disponibili dalla cache.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500">
                                Le operazioni effettuate offline verranno sincronizzate automaticamente quando torni online.
                            </p>
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Riprova
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
