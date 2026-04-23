// src/pages/machines/[id].tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function MachineDetailRedirect() {
    const router = useRouter();
    const { id } = router.query;

    useEffect(() => {
        if (!id) return;
        router.replace(`/equipment/${id}`);
    }, [router, id]);

    return null;
}
