import Link from "next/link";
import {
    Building2,
    ClipboardList,
    FileText,
    Factory,
    PackagePlus,
    QrCode,
    ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OrgType = "manufacturer" | "customer" | null;

interface QuickAction {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface QuickActionsPanelProps {
    orgType: OrgType;
    canManage: boolean;
    canOperate: boolean;
}

export default function QuickActionsPanel({
    orgType,
    canManage,
    canOperate,
}: QuickActionsPanelProps) {
    const actions: QuickAction[] = [];

    if (orgType === "manufacturer" && canManage) {
        actions.push(
            {
                title: "Nuovo cliente",
                description: "Crea una nuova organizzazione cliente.",
                href: "/customers/new",
                icon: Building2,
            },
            {
                title: "Nuova macchina",
                description: "Aggiungi una macchina al catalogo costruttore.",
                href: "/equipment/new",
                icon: Factory,
            }
        );
    }

    if (orgType === "customer" && canManage) {
        actions.push({
            title: "Nuova macchina",
            description: "Registra una macchina del cliente finale.",
            href: "/equipment/new",
            icon: Factory,
        });
    }

    if (canOperate) {
        actions.push(
            {
                title: "Nuovo work order",
                description: "Apri un nuovo ordine di lavoro.",
                href: "/work-orders/create",
                icon: ClipboardList,
            },
            {
                title: "Documenti",
                description: "Apri l’archivio documentale.",
                href: "/documents",
                icon: FileText,
            },
            {
                title: "Template checklist",
                description: "Gestisci i template checklist attivi.",
                href: "/checklists/templates",
                icon: PackagePlus,
            }
        );
    }

    actions.push(
        {
            title: "Scanner QR",
            description: "Apri il lettore rapido per accesso macchina.",
            href: "/scanner",
            icon: QrCode,
        },
        {
            title: "Sicurezza account",
            description: "Controlla MFA e impostazioni di accesso.",
            href: "/settings/security",
            icon: ShieldCheck,
        }
    );

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {actions.map((action) => {
                        const Icon = action.icon;

                        return (
                            <div
                                key={`${action.href}-${action.title}`}
                                className="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                        <Icon className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-foreground">
                                            {action.title}
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            {action.description}
                                        </div>

                                        <div className="mt-4">
                                            <Button size="sm" asChild>
                                                <Link href={action.href}>Apri</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}