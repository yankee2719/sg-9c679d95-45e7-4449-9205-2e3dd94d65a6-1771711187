import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminUsersPage() {
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        if (!router.isReady) return;
        router.replace("/users");
    }, [router]);

    return (
        <MainLayout userRole="admin">
            <SEO title={`${t("users.title")} - MACHINA`} />
            <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-muted-foreground">
                {t("common.loading")}
            </div>
        </MainLayout>
    );
}