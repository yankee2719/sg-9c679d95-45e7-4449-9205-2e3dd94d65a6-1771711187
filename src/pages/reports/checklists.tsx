import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";

export default function ReportsIndexRedirect() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).redirects.reportsIndex;
    const target = "/analytics";

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.replace(target);
        }, 150);
        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <MainLayout userRole={"technician" as any}>
            <SEO title={`${text.title} - MACHINA`} />
            <div className="container mx-auto max-w-3xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            {text.title}
                        </CardTitle>
                        <CardDescription>{text.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{text.body}</p>
                        <p className="text-xs text-muted-foreground">{text.loading}</p>
                        <Button onClick={() => router.replace(target)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {text.action}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
