// src/components/EventStatsCard.tsx
// Compatible with Next.js Pages Router

import { useEffect, useState } from 'react';
import { machineEventsService } from '@/services/machineEventsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp } from 'lucide-react';

interface EventStatsCardProps {
    organizationId: string;
    daysBack?: number;
}

export function EventStatsCard({
    organizationId,
    daysBack = 30,
}: EventStatsCardProps) {
    const [stats, setStats] = useState < Record < string, number>> ({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [organizationId, daysBack]);

    async function loadStats() {
        try {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - daysBack);

            const data = await machineEventsService.getStats(organizationId, dateFrom);
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    }

    const totalEvents = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const topEvents = Object.entries(stats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Attività Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-2">
                        <div className="h-12 bg-muted rounded" />
                        <div className="h-20 bg-muted rounded" />
                    </div>
                </CardContent>
            </Card>
    );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Attività Ultimi {daysBack} Giorni
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Total Events */}
                    <div>
                        <div className="text-3xl font-bold">{totalEvents}</div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Eventi Totali
                        </p>
                    </div>

                    {/* Top Events */}
                    {topEvents.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                            <p className="text-sm font-medium text-muted-foreground">
                                Tipologie Principali
                            </p>
                            {topEvents.map(([eventType, count]) => (
                                <div
                                    key={eventType}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="truncate flex-1">
                                        {eventType.split('.')[1]?.replace(/_/g, ' ') || eventType}
                                    </span>
                                    <Badge variant="secondary">{count}</Badge>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalEvents === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                            Nessuna attività registrata
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}