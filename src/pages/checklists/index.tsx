import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ChecklistsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/checklists/templates");
    }, [router]);
    return null;
}