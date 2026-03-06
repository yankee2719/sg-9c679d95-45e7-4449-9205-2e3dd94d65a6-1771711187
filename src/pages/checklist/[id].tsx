import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, FileCheck } from "lucide-react";

export default function LegacyChecklistDetailRedirectPage() {
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (!router.isReady) return;
        const target = id ? `/checklists/templates/${id}` : "/checklists/templates";
        const t = setTimeout(() => {
            router.replace(target);
        }, 200);
        return () => clearTimeout(t);
    }, [id, router, router.isReady]);

    const target = id ? `/checklists/templates/${id}` : "/checklists/templates";

    return (
        <MainLayout userRole={"technician" as any}>
            <div className="container mx-auto max-w-3xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" /> Redirect checklist legacy</CardTitle>
                        <CardDescription>
                            Questo dettaglio legacy è stato riallineato alla nuova struttura template checklist.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Stiamo reindirizzando automaticamente al nuovo percorso.
                        </p>
                        <Button onClick={() => router.replace(target)}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Vai ora
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
