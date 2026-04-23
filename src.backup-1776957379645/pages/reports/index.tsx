// src/pages/reports/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ReportsIndexRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/analytics");
    }, [router]);

    return null;
}
