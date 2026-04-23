// src/pages/machines/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MachinesIndexRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/equipment");
    }, [router]);

    return null;
}
