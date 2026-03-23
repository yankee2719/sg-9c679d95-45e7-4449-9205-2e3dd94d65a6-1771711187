import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { DocumentUpload } from "@/components/Equipment/DocumentUpload";
import { FileText, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";

interface Equipment { id: string; name: string; equipment_code: string; }

export default function EquipmentDocumentsPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    const [equipment, setEquipment] = useState < Equipment | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && typeof id === "string") { loadEquipment(id); }
    }, [id]);

    async function loadEquipment(equipmentId: string) {
        try {
            const { data, error } = await supabase.from("equipment").select("id, name, equipment_code").eq("id", equipmentId).single();
            if (error) throw error;
            setEquipment(data);
        } catch (error) { console.error("Failed to load equipment:", error); }
        finally { setLoading(false); }
    }

    if (!router.isReady || loading) {
        return (<MainLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>);
    }

    if (!id || typeof id !== "string") {
        return (<MainLayout><div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><p className="text-muted-foreground mb-4">{t("equipment.invalidId") || "ID equipaggiamento non valido"}</p><Link href="/equipment" className="text-primary hover:underline">{t("nav.equipment")}</Link></div></div></MainLayout>);
    }

    return (
        <MainLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <div>
                    <Link href={`/equipment/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" />{t("equipment.backToMachine") || "Torna alla macchina"}
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                <FileText className="w-7 h-7 text-primary" />{t("equipment.docManagement") || "Gestione Documenti"}
                            </h1>
                            {equipment && (<p className="mt-1 text-muted-foreground">{equipment.name} ({equipment.equipment_code})</p>)}
                        </div>
                    </div>
                </div>
                <DocumentUpload equipmentId={id} />
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-blue-400 mb-2">{t("equipment.docBestPracticesTitle") || "Best Practices Documentazione"}</h3>
                    <ul className="text-sm text-blue-300 space-y-1">
                        <li>• {t("equipment.docTip1") || "Mantieni sempre aggiornati i documenti CE obbligatori"}</li>
                        <li>• {t("equipment.docTip2") || "Usa nomi file descrittivi e includi versione/data"}</li>
                        <li>• {t("equipment.docTip3") || "Aggiungi una descrizione dettagliata quando carichi nuove versioni"}</li>
                        <li>• {t("equipment.docTip4") || "Conserva tutte le versioni precedenti per tracciabilità normativa"}</li>
                    </ul>
                </div>
            </div>
        </MainLayout>
    );
}
