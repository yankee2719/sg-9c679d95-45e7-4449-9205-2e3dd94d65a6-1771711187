// src/pages/compliance/index.tsx
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
  ShieldCheck,
  FileText,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export default function ComplianceIndexPage() {
  const { t } = useLanguage();

  const items = [
    {
      href: "/documents",
      title: t("compliance.item.documents.title"),
      description: t("compliance.item.documents.description"),
      icon: FileText,
    },
    {
      href: "/analytics",
      title: t("compliance.item.analytics.title"),
      description: t("compliance.item.analytics.description"),
      icon: ShieldCheck,
    },
    {
      href: "/checklists/executions",
      title: t("compliance.item.executions.title"),
      description: t("compliance.item.executions.description"),
      icon: AlertTriangle,
    },
  ];

  return (
    <ProtectedPage title={`${t("compliance.title")} - MACHINA`}>
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">{t("compliance.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("compliance.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block">
                <Card className="rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md">
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