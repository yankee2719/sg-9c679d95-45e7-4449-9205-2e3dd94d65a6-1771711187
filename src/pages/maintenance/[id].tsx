import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function MaintenanceDetailRedirectPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    useEffect(() => {
        if (!router.isReady || typeof id !== "string") return;
        router.replace(`/work-orders/${id}`);
    }, [router, id]);

    return (
        <MainLayout>
            <SEO title={`${t("maintenance.detail") || "Dettaglio manutenzione"} - MACHINA`} />
            <div className="container mx-auto max-w-3xl px-4 py-10">
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Wrench className="h-5 w-5" />
                            {t("maintenance.redirectTitle") || "Apertura dettaglio manutenzione"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>{t("maintenance.redirectDesc") || "Il dettaglio manutenzione legacy ora corrisponde al dettaglio del work order operativo."}</p>
                        <p className="flex items-center gap-2 text-foreground">
                            {t("maintenance.goTo") || "Vai a"} <span className="font-medium">/work-orders/[id]</span>
                            <ArrowRight className="h-4 w-4" />
                        </p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
