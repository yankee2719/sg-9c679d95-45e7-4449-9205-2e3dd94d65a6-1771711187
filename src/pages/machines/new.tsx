import { useLanguage } from "@/contexts/LanguageContext";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function MachinesNewRedirect() {
    const { t } = useLanguage();
    return (
        <RouteRedirectNotice
            to="/equipment/new"
            title={t("machines.new")}
            description={t("machines.redirectDesc") || "La creazione macchina è stata consolidata nel dominio equipment."}
            targetLabel="/equipment/new"
            withLayout
            seoTitle={`${t("machines.new")} - MACHINA`}
        />
    );
}
