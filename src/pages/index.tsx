import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/feedback/PageLoader";

export default function HomeRedirectPage() {
    const router = useRouter();
    const { loading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (loading) return;
        void router.replace(isAuthenticated ? "/dashboard" : "/landing");
    }, [isAuthenticated, loading, router]);

    return (
        <PageLoader
            title="MACHINA"
            description="Preparing your workspace and redirecting you to the correct entry point."
            fullscreen
        />
    );
}
