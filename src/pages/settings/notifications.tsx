import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NotificationRow {
    id: string;
    title?: string | null;
    message?: string | null;
    is_read?: boolean | null;
    created_at?: string | null;
}

export default function SettingsNotificationsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < NotificationRow[] > ([]);

    async function load() {
        setLoading(true);
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
            setRows([]);
            setLoading(false);
            return;
        }

        const profile = await getProfileData(user.id);
        const orgId = (profile as any)?.organizationId;

        let query = supabase.from("notifications").select("id,title,message,is_read,created_at").order("created_at", { ascending: false }).limit(50);
        if (orgId) query = query.eq("organization_id", orgId);

        const { data: notifications, error } = await query;
        setLoading(false);

        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return;
        }

        setRows((notifications as NotificationRow[]) ?? []);
    }

    useEffect(() => {
        load();
    }, []);

    const unread = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

    async function markAllRead() {
        const ids = rows.filter((r) => !r.is_read).map((r) => r.id);
        if (!ids.length) return;
        const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return;
        }
        toast({ title: "Notifiche aggiornate", description: "Tutte le notifiche sono state segnate come lette." });
        load();
    }

    async function clearRead() {
        const ids = rows.filter((r) => r.is_read).map((r) => r.id);
        if (!ids.length) return;
        const { error } = await supabase.from("notifications").delete().in("id", ids);
        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return;
        }
        toast({ title: "Notifiche eliminate", description: "Le notifiche lette sono state rimosse." });
        load();
    }

    return (
        <>
            <SEO title="Notifiche" />
            <MainLayout>
                <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
                    <Card className="rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Notifiche</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">Unread: {unread} · Totale: {rows.length}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={markAllRead}>Segna lette</Button>
                                <Button variant="outline" onClick={clearRead}>Elimina lette</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Caricamento notifiche...</p>
                            ) : rows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nessuna notifica disponibile.</p>
                            ) : (
                                <div className="space-y-3">
                                    {rows.map((row) => (
                                        <div key={row.id} className="rounded-2xl border border-border p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-medium">{row.title || "Notifica"}</h3>
                                                    <p className="mt-1 text-sm text-muted-foreground">{row.message || "Nessun dettaglio disponibile."}</p>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{row.is_read ? "Letta" : "Da leggere"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </>
    );
}
