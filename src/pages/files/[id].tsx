// src/pages/files/[id].tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function FileDetailRedirect() {
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (!id) return;
        router.replace(`/documents/${id}`);
    }, [router, id]);

    return null;
}
