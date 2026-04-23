import { useLanguage } from "@/contexts/LanguageContext";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function ChecklistExecutionAnalyticsRedirectPage() {
    const { t } = useLanguage();
    return (
        <RouteRedirectNotice
            to="/checklists/executions"
            title={t("analytics.checklistExecTitle") || "Analytics checklist"}
            description={t("analytics.checklistExecRedirectDesc") || "La vecchia vista analytics è stata consolidata nello storico esecuzioni checklist."}
            targetLabel="/checklists/executions"
            withLayout
            seoTitle={`${t("analytics.checklistExecTitle") || "Analytics checklist"} - MACHINA`}
        />
    );
}
