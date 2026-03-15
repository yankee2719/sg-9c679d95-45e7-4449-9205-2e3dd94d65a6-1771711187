import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistTexts } from "@/lib/checklistsPageText";

export default function LegacyChecklistNewPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);

    useEffect(() => {
        router.replace("/checklists/templates/new");
    }, [router]);

    return <MainLayout>{text.common.loginRedirect}</MainLayout>;
}
