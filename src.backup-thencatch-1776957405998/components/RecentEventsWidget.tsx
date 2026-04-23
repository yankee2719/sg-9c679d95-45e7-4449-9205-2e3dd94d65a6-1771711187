import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { machineEventsService, type MachineEvent } from "@/services/machineEventsService";

interface RecentEventsWidgetProps {
    organizationId: string;
    limit?: number;
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "ora";
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    return `${diffDays}g fa`;
}

function getEventLabel(eventType: string): string {
    const [, rawLabel] = eventType.split(".");
    return (rawLabel || eventType).replace(/_/g, " ");
}

function getPayloadText(payload: Record<string, any> | null | undefined, key: string): string | null {
    const value = payload?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getMachineDisplayName(event: MachineEvent): string {
    return (
        getPayloadText(event.payload, "machine_name") ||
        getPayloadText(event.payload, "machineCode") ||
        getPayloadText(event.payload, "machine_code") ||
        event.machine_id ||
        "Macchina senza nome"
    );
}

function getSerialNumber(event: MachineEvent): string | null {
    return (
        getPayloadText(event.payload, "serial_number") ||
        getPayloadText(event.payload, "serialNumber") ||
        null
    );
}

function getActorName(event: MachineEvent): string | null {
    return (
        getPayloadText(event.payload, "actor_name") ||
        getPayloadText(event.payload, "performed_by") ||
        event.actor_id ||
        null
    );
}

export function RecentEventsWidget({ organizationId, limit = 10 }: RecentEventsWidgetProps) {
    const [events, setEvents] = useState<MachineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const loadEvents = async () => {
            try {
                const data = await machineEventsService.getOrganizationEvents(organizationId, { limit });
                if (!active) return;
                setEvents(data);
            } catch (error) {
                console.error("Failed to load recent events:", error);
                if (active) setEvents([]);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadEvents();
        const interval = window.setInterval(() => {
            void loadEvents();
        }, 30000);

        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, [organizationId, limit]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Eventi recenti</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 rounded bg-muted" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Eventi recenti
                </CardTitle>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <p className="py-4 text-center text-muted-foreground">Nessun evento recente</p>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {events.map((event) => {
                                const machineName = getMachineDisplayName(event);
                                const serialNumber = getSerialNumber(event);
                                const actorName = getActorName(event);

                                return (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {getEventLabel(event.event_type)}
                                                </Badge>
                                            </div>

                                            <p className="truncate text-sm font-medium">{machineName}</p>

                                            {serialNumber && (
                                                <p className="text-xs text-muted-foreground">S/N: {serialNumber}</p>
                                            )}

                                            {actorName && (
                                                <p className="mt-1 text-xs text-muted-foreground">Da: {actorName}</p>
                                            )}
                                        </div>

                                        <div className="whitespace-nowrap text-xs text-muted-foreground">
                                            {formatTimeAgo(event.created_at)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

