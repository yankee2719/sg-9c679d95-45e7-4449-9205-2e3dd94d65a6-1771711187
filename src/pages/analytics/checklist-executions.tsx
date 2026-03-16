import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function ChecklistExecutionAnalyticsRedirectPage() {
    return (
        <RouteRedirectNotice
            to="/checklists/executions"
            title="Analytics checklist"
            description="La vecchia vista analytics è stata consolidata nello storico esecuzioni checklist del namespace corrente."
            targetLabel="/checklists/executions"
            withLayout
            seoTitle="Analytics checklist - MACHINA"
        />
    );
}
