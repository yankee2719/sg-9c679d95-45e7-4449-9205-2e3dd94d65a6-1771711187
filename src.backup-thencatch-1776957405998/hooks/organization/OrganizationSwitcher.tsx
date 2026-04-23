// src/components/organization/OrganizationSwitcher.tsx
import { useMemo } from "react";
import { useRouter } from "next/router";
import { Factory, Building2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";

function getOrgIcon(type: "manufacturer" | "customer" | null) {
    return type === "manufacturer" ? Factory : Building2;
}

export default function OrganizationSwitcher() {
    const router = useRouter();
    const { toast } = useToast();
    const {
        loading,
        saving,
        activeOrgId,
        activeOrgType,
        activeRole,
        memberships,
        setActiveOrganization,
        reload,
    } = useActiveOrganization();

    const activeLabel = useMemo(() => {
        const current = memberships.find((m) => m.organization_id === activeOrgId);
        return current?.organization?.name ?? "Organizzazione attiva";
    }, [activeOrgId, memberships]);

    const ActiveIcon = getOrgIcon(activeOrgType);

    const handleChange = async (value: string) => {
        if (!value || value === activeOrgId) return;

        try {
            await setActiveOrganization(value);

            toast({
                title: "OK",
                description: "Organizzazione attiva aggiornata.",
            });

            router.replace(router.asPath);
        } catch (e: any) {
            toast({
                title: "Errore",
                description: e?.message ?? "Impossibile cambiare organizzazione attiva.",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Caricamento organizzazioni...
            </div>
        );
    }

    if (memberships.length <= 1) {
        return (
            <div className="rounded-xl border border-border bg-card px-3 py-2">
                <div className="flex items-center gap-2">
                    <ActiveIcon className="w-4 h-4 text-muted-foreground" />
                    <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{activeLabel}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {activeOrgType ?? "organization"} · {activeRole ?? "technician"}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-sm font-medium">Organizzazione attiva</div>
                    <div className="text-xs text-muted-foreground truncate">
                        {activeLabel} · {activeOrgType ?? "organization"} · {activeRole ?? "technician"}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => reload()}
                    disabled={saving}
                    title="Ricarica organizzazioni"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            <Select value={activeOrgId ?? undefined} onValueChange={handleChange} disabled={saving}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona organizzazione..." />
                </SelectTrigger>
                <SelectContent>
                    {memberships.map((membership) => {
                        const Icon = getOrgIcon(membership.organization?.type ?? null);
                        return (
                            <SelectItem key={membership.organization_id} value={membership.organization_id}>
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    <span>
                                        {membership.organization?.name ?? membership.organization_id}
                                    </span>
                                    <span className="text-xs text-muted-foreground capitalize">
                                        · {membership.organization?.type ?? "organization"} · {membership.role}
                                    </span>
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
}
