import { useMemo } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistFlowTexts } from "@/lib/checklistFlowText";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function LegacyWorkOrderChecklistRedirectPage() {
    const router = useRouter();
    const { id } = router.query;
    const { language } = useLanguage();
    const text = getChecklistFlowTexts(language).redirects.legacyWorkOrder;

    const target = useMemo(() => {
        const workOrderId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : null;
        return workOrderId ? `/work-orders/${workOrderId}` : "/work-orders";
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
