import { useEffect, useMemo, useState } from "react";
import { machineEventsService, type MachineEvent } from "@/services/machineEventsService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
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

const EVENT_CONFIG: Record<string, { icon: string; bgColor: string }> = {
    "lifecycle.changed": { bgColor: "bg-purple-500", icon: "🔄" },
    "lifecycle.commissioned": { bgColor: "bg-green-500", icon: "🏭" },
    "lifecycle.decommissioned": { bgColor: "bg-gray-500", icon: "🚫" },
    "lifecycle.transferred": { bgColor: "bg-yellow-500", icon: "📦" },
    "maintenance.completed": { bgColor: "bg-green-600", icon: "✅" },
    "maintenance.started": { bgColor: "bg-orange-500", icon: "🔧" },
    "inspection.completed": { bgColor: "bg-green-500", icon: "🔍" },
    "document.uploaded": { bgColor: "bg-blue-400", icon: "📄" },
    "document.version_added": { bgColor: "bg-blue-500", icon: "📝" },
    "document.signed": { bgColor: "bg-blue-600", icon: "✍️" },
    "checklist.executed": { bgColor: "bg-indigo-500", icon: "📋" },
    "anomaly.reported": { bgColor: "bg-red-500", icon: "⚠️" },
    "note.added": { bgColor: "bg-gray-400", icon: "📌" },
    "photo.added": { bgColor: "bg-pink-500", icon: "📷" },
    "machine.created": { bgColor: "bg-green-500", icon: "🏭" },
    "machine.updated": { bgColor: "bg-blue-500", icon: "✏️" },
};

const DEFAULT_CONFIG = { bgColor: "bg-gray-500", icon: "📌" };

// ─── i18n ───
const copy = {
    it: {
        eventLabels: {
            "lifecycle.changed": "Stato cambiato",
            "lifecycle.commissioned": "Commissionata",
            "lifecycle.decommissioned": "Dismessa",
            "lifecycle.transferred": "Trasferita",
            "maintenance.completed": "Manutenzione completata",
            "maintenance.started": "Manutenzione iniziata",
            "inspection.completed": "Ispezione completata",
            "document.uploaded": "Documento caricato",
            "document.version_added": "Nuova versione documento",
            "document.signed": "Documento firmato",
            "checklist.executed": "Checklist eseguita",
            "anomaly.reported": "Anomalia segnalata",
            "note.added": "Nota aggiunta",
            "photo.added": "Foto aggiunta",
            "machine.created": "Creata",
            "machine.updated": "Aggiornata",
        } as Record<string, string>,
        stateLabels: {
            active: "Attiva",
            inactive: "Inattiva",
            commissioning: "Commissioning",
            maintenance: "In manutenzione",
            under_maintenance: "In manutenzione",
            decommissioned: "Dismessa",
            transferred: "Trasferita",
        } as Record<string, string>,
        payloadKeys: {
            from_state: "Da stato",
            to_state: "A stato",
        } as Record<string, string>,
        defaultEvent: "Evento",
        noEvents: "Nessun evento registrato",
        noEventsHint: "Gli eventi appariranno qui automaticamente",
        chainOk: "Chain integra",
        chainError: "Errore integrità",
        refresh: "Aggiorna",
        retry: "Riprova",
        showAll: "Mostra tutti",
        actor: "Da",
        now: "Ora",
        mAgo: "m fa",
        hAgo: "h fa",
        dAgo: "g fa",
    },
    en: {
        eventLabels: {
            "lifecycle.changed": "Status changed",
            "lifecycle.commissioned": "Commissioned",
            "lifecycle.decommissioned": "Decommissioned",
            "lifecycle.transferred": "Transferred",
            "maintenance.completed": "Maintenance completed",
            "maintenance.started": "Maintenance started",
            "inspection.completed": "Inspection completed",
            "document.uploaded": "Document uploaded",
            "document.version_added": "New document version",
            "document.signed": "Document signed",
            "checklist.executed": "Checklist executed",
            "anomaly.reported": "Anomaly reported",
            "note.added": "Note added",
            "photo.added": "Photo added",
            "machine.created": "Created",
            "machine.updated": "Updated",
        } as Record<string, string>,
        stateLabels: {
            active: "Active",
            inactive: "Inactive",
            commissioning: "Commissioning",
            maintenance: "Under maintenance",
            under_maintenance: "Under maintenance",
            decommissioned: "Decommissioned",
            transferred: "Transferred",
        } as Record<string, string>,
        payloadKeys: {
            from_state: "From",
            to_state: "To",
        } as Record<string, string>,
        defaultEvent: "Event",
        noEvents: "No events recorded",
        noEventsHint: "Events will appear here automatically",
        chainOk: "Chain valid",
        chainError: "Integrity error",
        refresh: "Refresh",
        retry: "Retry",
        showAll: "Show all",
        actor: "By",
        now: "Now",
        mAgo: "m ago",
        hAgo: "h ago",
        dAgo: "d ago",
    },
    fr: {
        eventLabels: {
            "lifecycle.changed": "Statut modifié",
            "lifecycle.commissioned": "Mise en service",
            "lifecycle.decommissioned": "Mise hors service",
            "lifecycle.transferred": "Transférée",
            "maintenance.completed": "Maintenance terminée",
            "maintenance.started": "Maintenance démarrée",
            "inspection.completed": "Inspection terminée",
            "document.uploaded": "Document chargé",
            "document.version_added": "Nouvelle version document",
            "document.signed": "Document signé",
            "checklist.executed": "Checklist exécutée",
            "anomaly.reported": "Anomalie signalée",
            "note.added": "Note ajoutée",
            "photo.added": "Photo ajoutée",
            "machine.created": "Créée",
            "machine.updated": "Mise à jour",
        } as Record<string, string>,
        stateLabels: {
            active: "Active",
            inactive: "Inactive",
            commissioning: "Mise en service",
            maintenance: "En maintenance",
            under_maintenance: "En maintenance",
            decommissioned: "Hors service",
            transferred: "Transférée",
        } as Record<string, string>,
        payloadKeys: {
            from_state: "De",
            to_state: "À",
        } as Record<string, string>,
        defaultEvent: "Événement",
        noEvents: "Aucun événement enregistré",
        noEventsHint: "Les événements apparaîtront ici automatiquement",
        chainOk: "Chaîne intègre",
        chainError: "Erreur d'intégrité",
        refresh: "Actualiser",
        retry: "Réessayer",
        showAll: "Tout afficher",
        actor: "Par",
        now: "Maintenant",
        mAgo: "m",
        hAgo: "h",
        dAgo: "j",
    },
    es: {
        eventLabels: {
            "lifecycle.changed": "Estado cambiado",
            "lifecycle.commissioned": "Puesta en marcha",
            "lifecycle.decommissioned": "Fuera de servicio",
            "lifecycle.transferred": "Transferida",
            "maintenance.completed": "Mantenimiento completado",
            "maintenance.started": "Mantenimiento iniciado",
            "inspection.completed": "Inspección completada",
            "document.uploaded": "Documento cargado",
            "document.version_added": "Nueva versión documento",
            "document.signed": "Documento firmado",
            "checklist.executed": "Checklist ejecutada",
            "anomaly.reported": "Anomalía reportada",
            "note.added": "Nota añadida",
            "photo.added": "Foto añadida",
            "machine.created": "Creada",
            "machine.updated": "Actualizada",
        } as Record<string, string>,
        stateLabels: {
            active: "Activa",
            inactive: "Inactiva",
            commissioning: "Puesta en marcha",
            maintenance: "En mantenimiento",
            under_maintenance: "En mantenimiento",
            decommissioned: "Fuera de servicio",
            transferred: "Transferida",
        } as Record<string, string>,
        payloadKeys: {
            from_state: "De",
            to_state: "A",
        } as Record<string, string>,
        defaultEvent: "Evento",
        noEvents: "No hay eventos registrados",
        noEventsHint: "Los eventos aparecerán aquí automáticamente",
        chainOk: "Cadena íntegra",
        chainError: "Error de integridad",
        refresh: "Actualizar",
        retry: "Reintentar",
        showAll: "Mostrar todos",
        actor: "Por",
        now: "Ahora",
        mAgo: "m",
        hAgo: "h",
        dAgo: "d",
    },
} as const;

type CopyLang = (typeof copy)[keyof typeof copy];

export function MachineEventTimeline({
    machineId,
    limit = 50,
    showIntegrityCheck = false,
    compact = false,
}: MachineEventTimelineProps) {
    const { language } = useLanguage();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;

    const [events, setEvents] = useState < MachineEvent[] > ([]);
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(true);
    const [integrityChecked, setIntegrityChecked] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [error, setError] = useState < string | null > (null);

    const getLocale = () => {
        switch (language) {
            case "fr": return "fr-FR";
            case "es": return "es-ES";
            case "en": return "en-GB";
            default: return "it-IT";
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat(getLocale(), {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateString));
    };

    const formatRelativeTime = (dateString: string) => {
        const diffMs = Date.now() - new Date(dateString).getTime();
        const mins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);

        if (mins < 1) return text.now;
        if (mins < 60) return `${mins}${text.mAgo}`;
        if (hrs < 24) return `${hrs}${text.hAgo}`;
        if (days < 7) return `${days}${text.dAgo}`;
        return formatDate(dateString);
    };

    // Traduce i valori del payload (from_state, to_state)
    const translatePayloadValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined) return "—";
        const strValue = String(value);
        if (key === "from_state" || key === "to_state") {
            return text.stateLabels[strValue] ?? strValue;
        }
        if (typeof value === "object") return JSON.stringify(value);
        return strValue;
    };

    // Traduce le chiavi del payload
    const translatePayloadKey = (key: string): string => {
        return text.payloadKeys[key] ?? key.replace(/_/g, " ");
    };

    const getEventLabel = (eventType: string): string => {
        return text.eventLabels[eventType] ?? text.defaultEvent;
    };

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
                    {text.retry}
                </Button>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="py-12 text-center text-muted-foreground">
                <History className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p className="font-medium">{text.noEvents}</p>
                <p className="mt-1 text-sm">{text.noEventsHint}</p>
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
                                {text.chainOk}
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="border-red-300 text-red-600 dark:border-red-500/30"
                            >
                                <ShieldAlert className="mr-1 h-3 w-3" />
                                {text.chainError}
                            </Badge>
                        )
                    )}

                    <Button variant="ghost" size="sm" onClick={() => void loadData()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {text.refresh}
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
                                            {getEventLabel(event.event_type)}
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
                                                            <span className="font-medium">
                                                                {translatePayloadKey(key)}:
                                                            </span>{" "}
                                                            {translatePayloadValue(key, value)}
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
                                        {text.actor}: {event.actor_type}
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
                    {text.showAll} ({events.length})
                </Button>
            )}
        </div>
    );
}

export default MachineEventTimeline;
