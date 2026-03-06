import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function ChecklistExecutionAnalyticsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/checklists/executions");
    }, [router]);

    return (
        <MainLayout>
            <SEO title="Analytics checklist - MACHINA" />
            <div className="container mx-auto max-w-3xl px-4 py-10">
                <Card className="rounded-2xl shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <BarChart3 className="h-5 w-5" />
                            Analytics checklist
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            La vecchia dashboard analytics è stata consolidata nello storico
                            esecuzioni checklist del nuovo namespace.
                        </p>
                        <p className="flex items-center gap-2 text-foreground">
                            Vai a <span className="font-medium">/checklists/executions</span>
                            <ArrowRight className="h-4 w-4" />
                        </p>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
