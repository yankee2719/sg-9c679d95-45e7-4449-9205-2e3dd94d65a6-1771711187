import { useEffect } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/components/Layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";

export default function WorkOrdersCreateRedirectPage() {
    const router = useRouter();
    const { membership } = useAuth();

    useEffect(() => {
        const query = router.asPath.includes("?") ? router.asPath.slice(router.asPath.indexOf("?")) : "";
        void router.replace(`/work-orders/new${query}`);
    }, [router]);

    return (
        <MainLayout userRole={membership?.role ?? "viewer"}>
            <div className="p-8 text-sm text-muted-foreground">Reindirizzamento alla nuova pagina ordine di lavoro...</div>
        </MainLayout>
    );
}

