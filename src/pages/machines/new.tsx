// src/pages/machines/new.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MachinesNewRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/equipment/new");
    }, [router]);

    return null;
}
