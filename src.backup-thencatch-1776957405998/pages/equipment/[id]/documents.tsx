import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentUpload } from "@/components/Equipment/DocumentUpload";
import { MainLayout } from "@/components/Layout/MainLayout";
import { getMachineDocumentsContext } from "@/lib/machineWorkspaceApi";

export default function EquipmentDocumentsPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    const [machine, setMachine] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof id !== "string") return;
        let active = true;
        const loadMachine = async () => {
            setLoading(true);
            try {
                const data = await getMachineDocumentsContext(id);
                if (active) setMachine(data.machine ?? null);
            } catch (error) {
                console.error("Failed to load machine documents context:", error);
                if (active) setMachine(null);
            } finally {
                if (active) setLoading(false);
            }
        };
        void loadMachine();
        return () => { active = false; };
    }, [id]);

    if (!router.isReady || loading) {
        return <MainLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;
    }

    if (typeof id !== "string") {
        return <MainLayout><div className="flex min-h-[60vh] items-center justify-center px-4"><div className="text-center"><p className="mb-4 text-muted-foreground">{t("equipment.invalidId") || "Invalid machine id"}</p><Link href="/equipment" className="text-primary hover:underline">{t("nav.equipment") || "Machines"}</Link></div></div></MainLayout>;
    }

    const secondaryCode = machine?.internal_code || machine?.serial_number || "—";

    return (
        <MainLayout>
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
                <div>
                    <Link href={`/equipment/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("equipment.backToMachine") || "Back to machine"}</Link>
                    <div className="space-y-2"><h1 className="flex items-center gap-3 text-2xl font-bold text-foreground lg:text-3xl"><FileText className="h-7 w-7 text-primary" />{t("equipment.docManagement") || "Document management"}</h1><p className="text-sm text-muted-foreground lg:text-base">{machine ? `${machine.name} · ${secondaryCode}` : t("equipment.machineNotFound") || "Machine not found"}</p></div>
                </div>
                <DocumentUpload machineId={id} />
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6"><h3 className="mb-2 text-sm font-semibold text-blue-500 dark:text-blue-300">{t("equipment.docBestPracticesTitle") || "Documentation best practices"}</h3><ul className="space-y-1 text-sm text-blue-600 dark:text-blue-200"><li>• {t("equipment.docTip1") || "Keep mandatory CE documents updated."}</li><li>• {t("equipment.docTip2") || "Use descriptive filenames with version and date."}</li><li>• {t("equipment.docTip3") || "Add a clear change summary when uploading a new version."}</li><li>• {t("equipment.docTip4") || "Preserve version history for auditability and compliance."}</li></ul></div>
            </div>
        </MainLayout>
    );
}
