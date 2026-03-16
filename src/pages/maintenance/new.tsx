import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function MaintenanceNewRedirectPage() {
    return (
        <RouteRedirectNotice
            to="/work-orders/create?work_type=preventive"
            title="Nuova manutenzione"
            description="La creazione delle manutenzioni preventive passa ora dal modulo work orders, così il flusso operativo resta unico e tracciabile."
            targetLabel="/work-orders/create?work_type=preventive"
            withLayout
            seoTitle="Nuova manutenzione - MACHINA"
        />
    );
}
