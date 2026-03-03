import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MaintenanceNewRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/work-orders/new?work_type=preventive");
    }, [router]);
    return null;
}