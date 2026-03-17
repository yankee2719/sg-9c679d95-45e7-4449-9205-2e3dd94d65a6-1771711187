import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react";

interface DeletedCustomer {
    id: string;
    name: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
    deleted_at: string | null;
}

export default function TrashSettingsPage() {
    const { membership, session } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState < string | null > (null);
    const [rows, setRows] = useState < DeletedCustomer[] > ([]);

    const userRole = membership?.role ?? "technician";

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (await supabase.auth.getSession()).data.session?.access_token;

        if (!accessToken) throw new Error("Sessione scaduta");
        return accessToken;
    };

    const loadTrash = async () => {
        setLoading(true);
        try {
            const accessToken = await getAccessToken();

            const response = await fetch("/api/customers/trash", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore caricamento cestino");
            }

            setRows((data.customers ?? []) as DeletedCustomer[]);
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore caricamento cestino",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTrash();
    }, []);

    const handleRestore = async (customerId: string, customerName: string | null) => {
        setRestoringId(customerId);

        try {
            const accessToken = await getAccessToken();

            const response = await fetch(`/api/customers/${customerId}/restore`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore ripristino cliente");
            }

            setRows((prev) => prev.filter((row) => row.id !== customerId));

            toast({
                title: "Cliente ripristinato",
                description: customerName || customerId,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore ripristino cliente",
                variant: "destructive",
            });
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title="Cestino di sistema - MACHINA" />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div>
                        <h1 className="text-3xl font-bold">Cestino di sistema</h1>
                        <p className="text-sm text-muted-foreground">
                            Qui trovi i clienti eliminati logicamente. Il ripristino riattiva il
                            cliente e le membership, ma non riattiva automaticamente le assegnazioni
                            macchina.
                        </p>
                    </div>

                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                Clienti nel cestino
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-10 text-muted-foreground">
                                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    Caricamento cestino...
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                                    Nessun cliente nel cestino.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rows.map((row) => (
                                        <div
                                            key={row.id}
                                            className="rounded-2xl border border-border p-4"
                                        >
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-lg font-semibold">
                                                            {row.name || "Cliente senza nome"}
                                                        </div>
                                                        <Badge variant="outline">
                                                            eliminato
                                                        </Badge>
                                                    </div>

                                                    <div className="text-sm text-muted-foreground">
                                                        {row.email || "—"}
                                                        {row.city ? ` · ${row.city}` : ""}
                                                        {row.phone ? ` · ${row.phone}` : ""}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground">
                                                        Eliminato il:{" "}
                                                        {row.deleted_at
                                                            ? new Date(row.deleted_at).toLocaleString(
                                                                "it-IT"
                                                            )
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div>
                                                    <Button
                                                        onClick={() =>
                                                            handleRestore(row.id, row.name)
                                                        }
                                                        disabled={restoringId === row.id}
                                                    >
                                                        {restoringId === row.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                                        )}
                                                        Ripristina
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}