import { Badge } from "@/components/ui/badge";
import {
    Building2,
    CalendarDays,
    Factory,
    Hash,
    MapPin,
    Package,
    Settings2,
    Wrench,
} from "lucide-react";

type OrgType = "manufacturer" | "customer" | null;

interface MachineSummaryHeroProps {
    name: string | null;
    internalCode: string | null;
    serialNumber: string | null;
    brand: string | null;
    model: string | null;
    lifecycleState: string | null;
    orgType: OrgType;
    ownerOrganizationName?: string | null;
    assignedCustomerName?: string | null;
    plantName?: string | null;
    lineName?: string | null;
    createdAt?: string | null;
}

function formatDate(value: string | null | undefined) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("it-IT", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return value;
    }
}

function getLifecycleBadgeClass(lifecycleState: string | null | undefined) {
    switch (String(lifecycleState || "").toLowerCase()) {
        case "active":
            return "border-green-300 bg-green-100 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300";
        case "maintenance":
        case "under_maintenance":
            return "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300";
        case "inactive":
            return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300";
        case "commissioning":
            return "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300";
        case "decommissioned":
            return "border-red-300 bg-red-100 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300";
        default:
            return "border-border bg-muted text-foreground";
    }
}

function InfoPill({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
                {value || "—"}
            </div>
        </div>
    );
}

export default function MachineSummaryHero({
    name,
    internalCode,
    serialNumber,
    brand,
    model,
    lifecycleState,
    orgType,
    ownerOrganizationName,
    assignedCustomerName,
    plantName,
    lineName,
    createdAt,
}: MachineSummaryHeroProps) {
    return (
        <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`border ${getLifecycleBadgeClass(lifecycleState)}`}>
                            {lifecycleState || "active"}
                        </Badge>

                        {orgType === "manufacturer" ? (
                            <Badge variant="outline" className="gap-1">
                                <Factory className="h-3 w-3" />
                                Costruttore
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1">
                                <Building2 className="h-3 w-3" />
                                Cliente finale
                            </Badge>
                        )}
                    </div>

                    <h1 className="mt-4 truncate text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        {name || "Macchina"}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {internalCode || "Codice non definito"}
                        </span>

                        <span className="inline-flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {serialNumber || "Matricola non definita"}
                        </span>

                        <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Creata il {formatDate(createdAt)}
                        </span>
                    </div>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[520px]">
                    <InfoPill
                        icon={<Wrench className="h-3.5 w-3.5" />}
                        label="Marca"
                        value={brand}
                    />
                    <InfoPill
                        icon={<Settings2 className="h-3.5 w-3.5" />}
                        label="Modello"
                        value={model}
                    />
                    <InfoPill
                        icon={<Factory className="h-3.5 w-3.5" />}
                        label="Proprietà"
                        value={ownerOrganizationName}
                    />
                    <InfoPill
                        icon={<Building2 className="h-3.5 w-3.5" />}
                        label="Cliente assegnato"
                        value={assignedCustomerName}
                    />
                    <InfoPill
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Stabilimento"
                        value={plantName}
                    />
                    <InfoPill
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Linea"
                        value={lineName}
                    />
                </div>
            </div>
        </div>
    );
}