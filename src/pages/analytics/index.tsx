// src/pages/analytics/index.tsx
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import ProtectedPage from "@/components/app/ProtectedPage";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    BarChart3,
    CheckSquare,
    ClipboardList,
    ChevronRight,
} from "lucide-react";

export default function AnalyticsHomePage() {
    const { t } = useLanguage();

    const items = [
        {
            href: "/checklists/executions",
            title: t("analytics.item.checklists.title"),
            description: t("analytics.item.checklists.description"),
            icon: CheckSquare,
        },
        {
            href: "/work-orders",
            title: t("analytics.item.workOrders.title"),
            description: t("analytics.item.workOrders.description"),
            icon: ClipboardList,
        },
    ];

    return (
        <ProtectedPage title={`${t("analytics.title")} - MACHINA`}>
            <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold">{t("analytics.title")}</h1>
                            <p className="text-sm text-muted-foreground">
                                {t("analytics.subtitle")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className="block">
                                <Card className="rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm">
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <CardTitle className="text-base">{item.title}</CardTitle>
                                        <CardDescription>{item.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent />
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </ProtectedPage>
    );
}