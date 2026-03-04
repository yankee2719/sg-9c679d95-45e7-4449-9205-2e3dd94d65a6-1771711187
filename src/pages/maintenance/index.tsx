import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MaintenanceNewRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/work-orders/create?work_type=preventive");
    }, [router]);

    return null;
}