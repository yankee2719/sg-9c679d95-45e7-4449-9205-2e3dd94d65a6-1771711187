import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MaintenanceRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/work-orders?work_type=preventive");
    }, [router]);
    return null;
}