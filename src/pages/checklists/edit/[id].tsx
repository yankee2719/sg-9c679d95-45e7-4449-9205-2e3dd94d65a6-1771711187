import { useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { getChecklistTexts } from "@/lib/checklistsPageText";

export default function LegacyChecklistEditPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const text = getChecklistTexts(language);
    const id = typeof router.query.id === "string" ? router.query.id : null;

    useEffect(() => {
        if (id) {
            router.replace(`/checklists/templates/${id}`);
        }
    }, [id, router]);

    return <MainLayout>{text.common.loginRedirect}</MainLayout>;
}
