import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MaintenanceRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/work-orders?type=maintenance");
    }, []);

    return null;
}