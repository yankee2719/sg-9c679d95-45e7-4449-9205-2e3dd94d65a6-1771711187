import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MaintenanceNewRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/work-orders/new?type=maintenance");
    }, []);

    return null;
}