import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, ListChecks } from "lucide-react";

export default function LegacyChecklistIndexRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const t = setTimeout(() => {
            router.replace("/checklists/templates");
        }, 200);
        return () => clearTimeout(t);
    }, [router]);

    return (
        <MainLayout userRole={"technician" as any}>
            <div className="container mx-auto max-w-3xl px-4 py-16">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5" /> Redirect checklist legacy</CardTitle>
                        <CardDescription>
                            Questo percorso legacy è stato riallineato al nuovo dominio checklist/templates.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Stiamo reindirizzando automaticamente alla nuova sezione template checklist.
                        </p>
                        <Button onClick={() => router.replace("/checklists/templates")}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Vai ora
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
