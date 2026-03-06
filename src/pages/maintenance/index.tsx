import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function MaintenanceIndexRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/work-orders?work_type=preventive");
    }, [router]);

    return (
        <MainLayout>
            <SEO title="Manutenzione - MACHINA" />
            <div className="container mx-auto max-w-3xl px-4 py-10">
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Wrench className="h-5 w-5" />
                            Reindirizzamento manutenzione
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            La sezione legacy <strong>maintenance</strong> ora usa il flusso
                            operativo unificato basato su <strong>work orders</strong>.
                        </p>
                        <p className="flex items-center gap-2 text-foreground">
                            Vai a <span className="font-medium">/work-orders?work_type=preventive</span>
                            <ArrowRight className="h-4 w-4" />
                        </p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
