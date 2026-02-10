// src/components/RecentEventsWidget.tsx
// Compatible with Next.js Pages Router

import { useEffect, useState } from 'react';
import { MachineEventService } from '@/services/machineEventsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock } from 'lucide-react';

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

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    return `${diffDays}g fa`;
}

export function RecentEventsWidget({
    organizationId,
    limit = 10,
}: RecentEventsWidgetProps) {
    const [events, setEvents] = useState < any[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvents();

        // Auto-refresh ogni 30 secondi
        const interval = setInterval(loadEvents, 30000);
        return () => clearInterval(interval);
    }, [organizationId, limit]);

    async function loadEvents() {
        try {
            const data = await MachineEventService.getRecentEvents(
                organizationId,
                limit
            );
            setEvents(data);
        } catch (error) {
            console.error('Failed to load recent events:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Eventi Recenti</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted rounded" />
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
                    Eventi Recenti
                </CardTitle>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                        Nessun evento recente
                    </p>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {events.map((event) => (
                                <div
                                    key={event.event_id}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                                {event.event_type.split('.')[1]?.replace(/_/g, ' ') ||
                                                    event.event_type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium truncate">
                                            {event.machine_name || 'Macchina senza nome'}
                                        </p>
                                        {event.serial_number && (
                                            <p className="text-xs text-muted-foreground">
                                                S/N: {event.serial_number}
                                            </p>
                                        )}
                                        {event.actor_name && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Da: {event.actor_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTimeAgo(event.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
