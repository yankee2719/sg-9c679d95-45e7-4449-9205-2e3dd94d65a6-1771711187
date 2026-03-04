import { useEffect } from "react";
import { useRouter } from "next/router";

export default function WorkOrdersNewRedirect() {
    const router = useRouter();
    useEffect(() => {
        const q = router.asPath.includes("?") ? router.asPath.split("?")[1] : "";
        router.replace(`/work-orders/create${q ? `?${q}` : ""}`);
    }, [router]);
    return null;
}