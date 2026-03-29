import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";

export default function ReportsIndexRedirect() {
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).redirects.reportsIndex;
    const target = "/analytics";

    return (
        <RouteRedirectNotice
            to={target}
            title={text.title}
            description={text.description}
            targetLabel={target}
            withLayout
            seoTitle={`${text.title} - MACHINA`}
        />
    );
}
