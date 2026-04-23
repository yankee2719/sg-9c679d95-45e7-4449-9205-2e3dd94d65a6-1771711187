// src/pages/regulatory/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RegulatoryIndexRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/compliance");
    }, [router]);

    return null;
}
