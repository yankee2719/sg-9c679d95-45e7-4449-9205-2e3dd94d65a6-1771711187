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
import { ArchiveRestore, Loader2, Trash2, Factory, FileText, Building2 } from "lucide-react";

interface DeletedCustomer {
    id: string;
    name: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
    deleted_at: string | null;
}

interface DeletedMachine {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    lifecycle_state: string | null;
    deleted_at: string | null;
}

interface DeletedDocument {
    id: string;
    title: string | null;
    category: string | null;
    language: string | null;
    machine_id: string | null;
    updated_at: string | null;
}

export default function TrashSettingsPage() {
    const { membership, session } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);

    const [customers, setCustomers] = useState < DeletedCustomer[] > ([]);
    const [machines, setMachines] = useState < DeletedMachine[] > ([]);
    const [documents, setDocuments] = useState < DeletedDocument[] > ([]);

    const [restoringCustomerId, setRestoringCustomerId] = useState < string | null > (null);
    const [restoringMachineId, setRestoringMachineId] = useState < string | null > (null);
    const [restoringDocumentId, setRestoringDocumentId] = useState < string | null > (null);

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

            const [customersRes, machinesRes, documentsRes] = await Promise.all([
                fetch("/api/customers/trash", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
                fetch("/api/machines/trash", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
                fetch("/api/documents/trash", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
            ]);

            const [customersData, machinesData, documentsData] = await Promise.all([
                customersRes.json(),
                machinesRes.json(),
                documentsRes.json(),
            ]);

            if (!customersRes.ok) {
                throw new Error(customersData?.error || "Errore caricamento cestino clienti");
            }
            if (!machinesRes.ok) {
                throw new Error(machinesData?.error || "Errore caricamento cestino macchine");
            }
            if (!documentsRes.ok) {
                throw new Error(documentsData?.error || "Errore caricamento cestino documenti");
            }

            setCustomers((customersData.customers ?? []) as DeletedCustomer[]);
            setMachines((machinesData.machines ?? []) as DeletedMachine[]);
            setDocuments((documentsData.documents ?? []) as DeletedDocument[]);
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

    const handleRestoreCustomer = async (row: DeletedCustomer) => {
        setRestoringCustomerId(row.id);

        try {
            const accessToken = await getAccessToken();

            const response = await fetch(`/api/customers/${row.id}/restore`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore ripristino cliente");
            }

            setCustomers((prev) => prev.filter((x) => x.id !== row.id));

            toast({
                title: "Cliente ripristinato",
                description: row.name || row.id,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore ripristino cliente",
                variant: "destructive",
            });
        } finally {
            setRestoringCustomerId(null);
        }
    };

    const handleRestoreMachine = async (row: DeletedMachine) => {
        setRestoringMachineId(row.id);

        try {
            const accessToken = await getAccessToken();

            const response = await fetch(`/api/machines/${row.id}/restore`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore ripristino macchina");
            }

            setMachines((prev) => prev.filter((x) => x.id !== row.id));

            toast({
                title: "Macchina ripristinata",
                description: row.name || row.id,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore ripristino macchina",
                variant: "destructive",
            });
        } finally {
            setRestoringMachineId(null);
        }
    };

    const handleRestoreDocument = async (row: DeletedDocument) => {
        setRestoringDocumentId(row.id);

        try {
            const accessToken = await getAccessToken();

            const response = await fetch(`/api/documents/${row.id}/restore`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || "Errore ripristino documento");
            }

            setDocuments((prev) => prev.filter((x) => x.id !== row.id));

            toast({
                title: "Documento ripristinato",
                description: row.title || row.id,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message || "Errore ripristino documento",
                variant: "destructive",
            });
        } finally {
            setRestoringDocumentId(null);
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
                            Il ripristino riattiva l'entità eliminata logicamente. Per clienti e
                            macchine, le assegnazioni macchina restano inattive dopo il restore.
                        </p>
                    </div>

                    {loading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Caricamento cestino...
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Clienti nel cestino
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {customers.length === 0 ? (
                                        <EmptyTrash text="Nessun cliente nel cestino." />
                                    ) : (
                                        <div className="space-y-4">
                                            {customers.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.name || "Cliente senza nome"}
                                                    subtitle={`${row.email || "—"}${row.city ? ` · ${row.city}` : ""}${row.phone ? ` · ${row.phone}` : ""}`}
                                                    meta={`Eliminato il: ${row.deleted_at
                                                            ? new Date(row.deleted_at).toLocaleString("it-IT")
                                                            : "—"
                                                        }`}
                                                    badge="cliente"
                                                    busy={restoringCustomerId === row.id}
                                                    onRestore={() => handleRestoreCustomer(row)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Factory className="h-5 w-5" />
                                        Macchine nel cestino
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {machines.length === 0 ? (
                                        <EmptyTrash text="Nessuna macchina nel cestino." />
                                    ) : (
                                        <div className="space-y-4">
                                            {machines.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.name || "Macchina senza nome"}
                                                    subtitle={`${row.internal_code || "—"}${row.serial_number ? ` · ${row.serial_number}` : ""}${row.brand ? ` · ${row.brand}` : ""}${row.model ? ` · ${row.model}` : ""}`}
                                                    meta={`Eliminata il: ${row.deleted_at
                                                            ? new Date(row.deleted_at).toLocaleString("it-IT")
                                                            : "—"
                                                        }`}
                                                    badge="macchina"
                                                    busy={restoringMachineId === row.id}
                                                    onRestore={() => handleRestoreMachine(row)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Documenti nel cestino
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {documents.length === 0 ? (
                                        <EmptyTrash text="Nessun documento nel cestino." />
                                    ) : (
                                        <div className="space-y-4">
                                            {documents.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.title || "Documento senza titolo"}
                                                    subtitle={`${row.category || "—"}${row.language ? ` · ${row.language}` : ""}${row.machine_id ? ` · machine ${row.machine_id}` : ""}`}
                                                    meta={`Aggiornato il: ${row.updated_at
                                                            ? new Date(row.updated_at).toLocaleString("it-IT")
                                                            : "—"
                                                        }`}
                                                    badge="documento"
                                                    busy={restoringDocumentId === row.id}
                                                    onRestore={() => handleRestoreDocument(row)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}

function EmptyTrash({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {text}
        </div>
    );
}

function TrashRow({
    title,
    subtitle,
    meta,
    badge,
    busy,
    onRestore,
}: {
    title: string;
    subtitle: string;
    meta: string;
    badge: string;
    busy: boolean;
    onRestore: () => void;
}) {
    return (
        <div className="rounded-2xl border border-border p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold">{title}</div>
                        <Badge variant="outline">{badge}</Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">{subtitle}</div>
                    <div className="text-xs text-muted-foreground">{meta}</div>
                </div>

                <div>
                    <Button onClick={onRestore} disabled={busy}>
                        {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                        )}
                        Ripristina
                    </Button>
                </div>
            </div>
        </div>
    );
}