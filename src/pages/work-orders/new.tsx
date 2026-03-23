import { useMemo } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@/contexts/LanguageContext";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function WorkOrdersNewRedirect() {
    const router = useRouter();
    const { t } = useLanguage();
    const target = useMemo(() => {
        const q = router.asPath.includes("?") ? router.asPath.split("?")[1] : "";
        return `/work-orders/create${q ? `?${q}` : ""}`;
    }, [router.asPath]);

    return (
        <RouteRedirectNotice
            to={target}
            title={t("workOrders.new")}
            description={t("workOrders.redirectDesc") || "La creazione dei work order è stata consolidata nella pagina operativa aggiornata. Ti stiamo reindirizzando automaticamente."}
            targetLabel={target}
            withLayout
            seoTitle={`${t("workOrders.new")} - MACHINA`}
        />
    );
}
