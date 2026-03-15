import { ReactNode, useMemo } from "react";
import { useRouter } from "next/router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMfaGuard } from "@/hooks/useMfaGuard";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";

interface RequireAal2Props {
    children: ReactNode;
    userRole?: string | null;
    title?: string;
    description?: string;
}

const copy = {
    it: { goToSecurity: "Vai a Sicurezza" },
    en: { goToSecurity: "Go to Security" },
    fr: { goToSecurity: "Aller à Sécurité" },
    es: { goToSecurity: "Ir a Seguridad" },
} as const;

export default function RequireAal2({
    children,
    userRole,
    title = "Verifica 2FA richiesta",
    description = "Per accedere a questa area devi completare l’autenticazione a due fattori.",
}: RequireAal2Props) {
    const router = useRouter();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);
    const { loading, mustEnforceMfa, isAal2 } = useMfaGuard();

    if (loading) {
        return (
            <MainLayout userRole={userRole ?? "technician"}>
                <div className="container mx-auto py-10">
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (mustEnforceMfa && !isAal2) {
        return (
            <MainLayout userRole={userRole ?? "technician"}>
                <div className="container mx-auto max-w-2xl py-10">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                            <div className="space-y-3">
                                <div className="text-lg font-semibold">{title}</div>
                                <div className="text-sm text-muted-foreground">{description}</div>
                                <Button onClick={() => router.push("/settings/security")}>{text.goToSecurity}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return <>{children}</>;
}
