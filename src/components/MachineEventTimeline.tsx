import { useEffect, useMemo, useState } from "react";
import { machineEventsService, type MachineEvent } from "@/services/machineEventsService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    ShieldAlert,
    CheckCircle2,
    History,
    ChevronDown,
    RefreshCw,
} from "lucide-react";

interface MachineEventTimelineProps {
    machineId: string;
    limit?: number;
    showIntegrityCheck?: boolean;
    compact?: boolean;
}

const EVENT_CONFIG: Record<string, { label: string; bgColor: string; icon: string }> = {
    "lifecycle.changed": { label: "Stato cambiato", bgColor: "bg-purple-500", icon: "🔄" },
    "lifecycle.commissioned": { label: "Commissionata", bgColor: "bg-green-500", icon: "🏭" },
    "lifecycle.decommissioned": { label: "Dismessa", bgColor: "bg-gray-500", icon: "🚫" },
    "lifecycle.transferred": { label: "Trasferita", bgColor: "bg-yellow-500", icon: "📦" },
    "maintenance.completed": {
        label: "Manutenzione completata",
        bgColor: "bg-green-600",
        icon: "✅",
    },
    "maintenance.started": {
        label: "Manutenzione iniziata",
        bgColor: "bg-orange-500",
        icon: "🔧",
    },
    "inspection.completed": {
        label: "Ispezione completata",
        bgColor: "bg-green-500",
        icon: "🔍",
    },
    "document.uploaded": { label: "Documento caricato", bgColor: "bg-blue-400", icon: "📄" },
    "document.version_added": {
        label: "Nuova versione documento",
        bgColor: "bg-blue-500",
        icon: "📝",
    },
    "document.signed": { label: "Documento firmato", bgColor: "bg-blue-600", icon: "✍️" },
    "checklist.executed": { label: "Checklist eseguita", bgColor: "bg-indigo-500", icon: "📋" },
    "anomaly.reported": { label: "Anomalia segnalata", bgColor: "bg-red-500", icon: "⚠️" },
    "note.added": { label: "Nota aggiunta", bgColor: "bg-gray-400", icon: "📌" },
    "photo.added": { label: "Foto aggiunta", bgColor: "bg-pink-500", icon: "📷" },
    "machine.created": { label: "Creata", bgColor: "bg-green-500", icon: "🏭" },
    "machine.updated": { label: "Aggiornata", bgColor: "bg-blue-500", icon: "✏️" },
};

const DEFAULT_CONFIG = { label: "Evento", bgColor: "bg-gray-500", icon: "📌" };

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
}

function formatRelativeTime(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return "Ora";
    if (mins < 60) return `${mins}m fa`;
    if (hrs < 24) return `${hrs}h fa`;
    if (days < 7) return `${days}g fa`;
    return formatDate(dateString);
}

function renderPayloadValue(value: unknown) {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

export function MachineEventTimeline({
    machineId,
    limit = 50,
    showIntegrityCheck = false,
    compact = false,
}: MachineEventTimelineProps) {
    const [events, setEvents] = useState < MachineEvent[] > ([]);
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(true);
    const [integrityChecked, setIntegrityChecked] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [error, setError] = useState < string | null > (null);

    const loadData = async () => {
        if (!machineId || machineId === "null") {
            setLoading(false);
            setError("ID macchina non valido");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await machineEventsService.getTimeline(machineId, { limit });
            setEvents(data);

            if (showIntegrityCheck && data.length > 0) {
                const result = await machineEventsService.verifyChain(machineId);
                setIsValid(result.isValid);
                setIntegrityChecked(true);
            } else {
                setIntegrityChecked(false);
                setIsValid(true);
            }
        } catch (err: any) {
            console.error("Failed to load timeline:", err);
            setError(err?.message ?? "Errore caricamento");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [machineId, limit, showIntegrityCheck]);

    const displayEvents = useMemo(() => {
        if (compact && !showAll) return events.slice(0, 5);
        return events;
    }, [compact, showAll, events]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-red-400" />
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadData()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Riprova
                </Button>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground">
                <History className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p className="font-medium">Nessun evento registrato</p>
                <p className="mt-1 text-sm">Gli eventi appariranno qui automaticamente</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-2">
                    {showIntegrityCheck && integrityChecked && (
                        isValid ? (
                            <Badge
                                variant="outline"
                                className="border-green-300 text-green-600 dark:border-green-500/30"
                            >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Chain integra
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="border-red-300 text-red-600 dark:border-red-500/30"
                            >
                                <ShieldAlert className="mr-1 h-3 w-3" />
                                Errore integrità
                            </Badge>
                        )
                    )}

                    <Button variant="ghost" size="sm" onClick={() => void loadData()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Aggiorna
                    </Button>
                </div>
            </div>

            <div className="relative">
                {displayEvents.map((event, index) => {
                    const config = EVENT_CONFIG[event.event_type] || DEFAULT_CONFIG;
                    const isLast = index === displayEvents.length - 1;

                    return (
                        <div key={event.id} className="relative pb-4 pl-8 last:pb-0">
                            {!isLast && (
                                <div className="absolute bottom-0 left-[11px] top-7 w-0.5 bg-border" />
                            )}

                            <div
                                className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full ${config.bgColor} text-xs text-white shadow-sm`}
                            >
                                <span className="text-sm leading-none">{config.icon}</span>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <Badge
                                            variant="outline"
                                            className="mb-1 text-xs font-semibold"
                                        >
                                            {config.label}
                                        </Badge>

                                        {event.payload && Object.keys(event.payload).length > 0 && (
                                            <div className="mt-1.5 space-y-0.5">
                                                {Object.entries(event.payload)
                                                    .filter(([key]) => !key.startsWith("_"))
                                                    .slice(0, compact ? 2 : 6)
                                                    .map(([key, value]) => (
                                                        <p
                                                            key={key}
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            <span className="font-medium capitalize">
                                                                {key.replace(/_/g, " ")}:
                                                            </span>{" "}
                                                            {renderPayloadValue(value)}
                                                        </p>
                                                    ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                                        <div className="font-medium">
                                            {formatRelativeTime(event.created_at)}
                                        </div>
                                        <div className="opacity-60">
                                            {formatDate(event.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {event.actor_type && event.actor_type !== "system" && (
                                    <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                                        Da: {event.actor_type}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {compact && events.length > 5 && !showAll && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAll(true)}
                >
                    <ChevronDown className="mr-1 h-4 w-4" />
                    Mostra tutti ({events.length})
                </Button>
            )}
        </div>
    );
}

export default MachineEventTimeline;