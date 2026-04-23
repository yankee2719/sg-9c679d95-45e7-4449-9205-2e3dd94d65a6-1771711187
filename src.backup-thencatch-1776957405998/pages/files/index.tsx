// src/pages/files/index.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function FilesIndexRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/documents");
    }, [router]);

    return null;
}
