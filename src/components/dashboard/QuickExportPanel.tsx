import { Download, Factory, Building2, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrgType = "manufacturer" | "customer" | null;

interface QuickExportPanelProps {
    orgType: OrgType;
}

function ExportLink({
    href,
    title,
    description,
    icon,
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <a
            href={href}
            className="block rounded-2xl border border-border p-4 transition hover:-translate-y-0.5 hover:bg-muted/40"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>

                <div>
                    <div className="font-semibold text-foreground">{title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{description}</div>
                </div>
            </div>
        </a>
    );
}

export default function QuickExportPanel({ orgType }: QuickExportPanelProps) {
    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export rapidi
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ExportLink
                    href="/api/export/machines"
                    title="Export macchine"
                    description="Scarica l’elenco macchine in CSV."
                    icon={<Factory className="h-4 w-4" />}
                />

                {orgType === "manufacturer" && (
                    <ExportLink
                        href="/api/export/customers"
                        title="Export clienti"
                        description="Scarica l’elenco clienti in CSV."
                        icon={<Building2 className="h-4 w-4" />}
                    />
                )}

                <ExportLink
                    href="/api/export/work-orders"
                    title="Export work orders"
                    description="Scarica gli ordini di lavoro in CSV."
                    icon={<ClipboardList className="h-4 w-4" />}
                />
            </CardContent>
        </Card>
    );
}