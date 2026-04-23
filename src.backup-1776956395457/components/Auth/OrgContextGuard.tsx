// src/components/Auth/OrgContextGuard.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserContext } from "@/lib/supabaseHelpers";

interface OrgContextGuardProps {
    children: React.ReactNode;
}

export default function OrgContextGuard({ children }: OrgContextGuardProps) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const check = async () => {
            try {
                const ctx = await getUserContext();

                if (!ctx?.orgId || !ctx?.orgType) {
                    router.replace("/settings/organization");
                    return;
                }

                setReady(true);
            } catch (error) {
                console.error(error);
                router.replace("/settings/organization");
            }
        };

        check();
    }, [router]);

    if (!ready) return null;
    return <>{children}</>;
}
