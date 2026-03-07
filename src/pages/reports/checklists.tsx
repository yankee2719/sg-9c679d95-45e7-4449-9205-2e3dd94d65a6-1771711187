// src/pages/reports/checklists.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ReportsChecklistRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/checklists/executions");
    }, [router]);

    return null;
}
