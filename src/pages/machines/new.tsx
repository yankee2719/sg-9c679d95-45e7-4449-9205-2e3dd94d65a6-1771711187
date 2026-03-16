import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function MachinesNewRedirect() {
    return (
        <RouteRedirectNotice
            to="/equipment/new"
            title="Nuova macchina"
            description="La creazione macchina è stata consolidata nel dominio equipment per mantenere il catalogo tecnico coerente."
            targetLabel="/equipment/new"
            withLayout
            seoTitle="Nuova macchina - MACHINA"
        />
    );
}
