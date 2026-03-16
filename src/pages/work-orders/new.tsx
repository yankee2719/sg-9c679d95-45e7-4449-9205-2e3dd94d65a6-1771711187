import { useMemo } from "react";
import { useRouter } from "next/router";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function WorkOrdersNewRedirect() {
    const router = useRouter();
    const target = useMemo(() => {
        const q = router.asPath.includes("?") ? router.asPath.split("?")[1] : "";
        return `/work-orders/create${q ? `?${q}` : ""}`;
    }, [router.asPath]);

    return (
        <RouteRedirectNotice
            to={target}
            title="Nuovo work order"
            description="La creazione dei work order è stata consolidata nella pagina operativa aggiornata. Ti stiamo reindirizzando automaticamente."
            targetLabel={target}
            withLayout
            seoTitle="Nuovo work order - MACHINA"
        />
    );
}
