import { useMemo } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function LegacyChecklistExecutionRedirectPage() {
    const router = useRouter();
    const { id } = router.query;
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).redirects.legacyExecution;

    const target = useMemo(() => {
        const executionId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
        return executionId ? `/checklists/executions/${executionId}` : "/checklists/executions";
    }, [id]);

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
