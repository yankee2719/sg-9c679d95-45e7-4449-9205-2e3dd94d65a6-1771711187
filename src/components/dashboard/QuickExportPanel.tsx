import { useState } from "react";
import { Download, Factory, Building2, ClipboardList, FileText, Users, Layers3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportEntity, type ExportEntity } from "@/services/exportService";
import { Button } from "@/components/ui/button";

type OrgType = "manufacturer" | "customer" | "enterprise" | "enterprise" | null;

interface QuickExportPanelProps {
    orgType: OrgType;
}

function ExportButton({
    entity,
    title,
    description,
    icon,
}: {
    entity: ExportEntity;
    title: string;
    description: string;
    icon: React.ReactNode;
}) {
    const [loading, setLoading] = useState(false);

    return (
        <Button
            variant="outline"
            className="h-auto w-full justify-start rounded-2xl p-4"
            onClick={async () => {
                setLoading(true);
                try {
                    await exportEntity(entity);
                } catch (error) {
                    console.error(`Export ${entity} failed:`, error);
                    alert(error instanceof Error ? error.message : "Export failed");
                } finally {
                    setLoading(false);
                }
            }}
        >
            <div className="flex items-start gap-3 text-left">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div>
                    <div className="font-semibold">{loading ? "Esportazione..." : title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{description}</div>
                </div>
            </div>
        </Button>
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
                <ExportButton
                    entity="machines"
                    title="Export macchine"
                    description="Scarica l’elenco macchine in CSV."
                    icon={<Factory className="h-4 w-4" />}
                />

                <ExportButton
                    entity="work-orders"
                    title="Export work orders"
                    description="Scarica gli ordini di lavoro in CSV."
                    icon={<ClipboardList className="h-4 w-4" />}
                />

                <ExportButton
                    entity="documents"
                    title="Export documenti"
                    description="Scarica l’archivio documentale in CSV."
                    icon={<FileText className="h-4 w-4" />}
                />

                <ExportButton
                    entity="users"
                    title="Export utenti"
                    description="Scarica utenti e membership in CSV."
                    icon={<Users className="h-4 w-4" />}
                />

                {orgType === "manufacturer" && (
                    <>
                        <ExportButton
                            entity="customers"
                            title="Export clienti"
                            description="Scarica l’elenco clienti in CSV."
                            icon={<Building2 className="h-4 w-4" />}
                        />
                        <ExportButton
                            entity="assignments"
                            title="Export assegnazioni"
                            description="Scarica assegnazioni macchine/clienti in CSV."
                            icon={<Layers3 className="h-4 w-4" />}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}
