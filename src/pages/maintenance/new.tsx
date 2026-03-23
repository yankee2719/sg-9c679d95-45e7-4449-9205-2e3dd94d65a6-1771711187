import { useLanguage } from "@/contexts/LanguageContext";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function MaintenanceNewRedirectPage() {
    const { t } = useLanguage();

    return (
        <RouteRedirectNotice
            to="/work-orders/create?work_type=preventive"
            title={t("maintenance.newTitle") || "Nuova manutenzione"}
            description={t("maintenance.newRedirectDesc") || "La creazione delle manutenzioni preventive passa ora dal modulo work orders."}
            targetLabel="/work-orders/create?work_type=preventive"
            withLayout
            seoTitle={`${t("maintenance.newTitle") || "Nuova manutenzione"} - MACHINA`}
        />
    );
}
