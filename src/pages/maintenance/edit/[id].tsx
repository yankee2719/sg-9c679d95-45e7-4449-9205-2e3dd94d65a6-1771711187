import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePenLine, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function MaintenanceEditRedirectPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    useEffect(() => {
        if (!router.isReady || typeof id !== "string") return;
        router.replace(`/work-orders/${id}`);
    }, [router, id]);

    return (
        <MainLayout>
            <SEO title={`${t("maintenance.edit") || "Modifica manutenzione"} - MACHINA`} />
            <div className="container mx-auto max-w-3xl px-4 py-10">
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <FilePenLine className="h-5 w-5" />
                            {t("maintenance.editRedirectTitle") || "Modifica manutenzione legacy"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>{t("maintenance.editRedirectDesc") || "La modifica del piano legacy è stata assorbita nel nuovo flusso operativo del work order."}</p>
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
