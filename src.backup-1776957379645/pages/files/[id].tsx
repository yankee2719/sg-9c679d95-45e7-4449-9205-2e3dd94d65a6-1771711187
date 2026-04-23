import { useMemo } from "react";
import { useRouter } from "next/router";
import { RouteRedirectNotice } from "@/components/feedback/RouteRedirectNotice";

export default function FileDetailRedirect() {
    const router = useRouter();
    const { id } = router.query;

    const target = useMemo(() => {
        const normalizedId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
        return normalizedId ? `/documents/${normalizedId}` : "/documents";
    }, [id]);

    return (
        <RouteRedirectNotice
            to={target}
            title="Dettaglio documento"
            description="Il dettaglio file è stato riallineato al modulo documentale corrente. Reindirizzamento in corso."
            targetLabel={target}
            withLayout
            seoTitle="Dettaglio documento - MACHINA"
        />
    );
}
