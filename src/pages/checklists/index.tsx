import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, ListChecks } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistTexts } from "@/lib/checklistsPageText";

export default function LegacyChecklistIndexRedirectPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    useEffect(() => {
        const timer = setTimeout(() => {
            router.replace("/checklists/templates");
        }, 200);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <MainLayout userRole={"technician"}>
            <div className="container mx-auto max-w-3xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ListChecks className="h-5 w-5" />
                            {text.legacy.title}
                        </CardTitle>
                        <CardDescription>{text.legacy.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{text.legacy.body}</p>
                        <Button onClick={() => router.replace("/checklists/templates")}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {text.legacy.action}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
