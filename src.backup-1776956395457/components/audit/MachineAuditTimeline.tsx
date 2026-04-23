import { useEffect, useState } from "react";
import { listAuditLogsForMachine } from "@/services/auditService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
    machineId: string;
}

function labelForAction(action: string) {
    const map: Record<string, string> = {
        create: "Creazione",
        update: "Modifica",
        archive: "Archiviazione",
        new_version: "Nuova versione documento",
        qr_update: "Aggiornamento QR",
        photo_update: "Aggiornamento foto",
    };
    return map[action] ?? action;
}

export default function MachineAuditTimeline({ machineId }: Props) {
    const [rows, setRows] = useState < any[] > ([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await listAuditLogsForMachine(machineId);
                setRows(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [machineId]);

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Audit timeline</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-sm text-muted-foreground">Caricamento audit...</div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nessun evento audit.</div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-border p-3">
                                <div className="font-medium">{labelForAction(row.action)}</div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(row.created_at).toLocaleString("it-IT")}
                                </div>
                                {row.metadata?.source && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Source: {row.metadata.source}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}