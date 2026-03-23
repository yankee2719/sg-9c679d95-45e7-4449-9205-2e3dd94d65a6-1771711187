import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
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
    const { t, language: appLang } = useLanguage();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);

    const [customers, setCustomers] = useState < DeletedCustomer[] > ([]);
    const [machines, setMachines] = useState < DeletedMachine[] > ([]);
    const [documents, setDocuments] = useState < DeletedDocument[] > ([]);

    const [restoringCustomerId, setRestoringCustomerId] = useState < string | null > (null);
    const [restoringMachineId, setRestoringMachineId] = useState < string | null > (null);
    const [restoringDocumentId, setRestoringDocumentId] = useState < string | null > (null);

    const userRole = membership?.role ?? "technician";
    const locale = appLang === "it" ? "it-IT" : appLang === "fr" ? "fr-FR" : appLang === "es" ? "es-ES" : "en-GB";

    const getAccessToken = async () => {
        const accessToken =
            session?.access_token ??
            (await supabase.auth.getSession()).data.session?.access_token;

        if (!accessToken) throw new Error("Session expired");
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

            if (!customersRes.ok) throw new Error(customersData?.error || "Error loading trash");
            if (!machinesRes.ok) throw new Error(machinesData?.error || "Error loading trash");
            if (!documentsRes.ok) throw new Error(documentsData?.error || "Error loading trash");

            setCustomers((customersData.customers ?? []) as DeletedCustomer[]);
            setMachines((machinesData.machines ?? []) as DeletedMachine[]);
            setDocuments((documentsData.documents ?? []) as DeletedDocument[]);
        } catch (err: any) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: err?.message || t("trash.errorLoad") || "Errore caricamento cestino",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTrash();
    }, []);

    const restoreEntity = async (
        entityType: "customer" | "machine" | "document",
        id: string,
        name: string,
        setRestoring: (id: string | null) => void,
        removeFromList: (id: string) => void
    ) => {
        setRestoring(id);
        try {
            const accessToken = await getAccessToken();
            const urlMap = {
                customer: `/api/customers/${id}/restore`,
                machine: `/api/machines/${id}/restore`,
                document: `/api/documents/${id}/restore`,
            };

            const response = await fetch(urlMap[entityType], {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Restore error");

            removeFromList(id);
            toast({
                title: t("trash.restored"),
                description: name,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: t("common.error") || "Errore",
                description: err?.message || "Restore error",
                variant: "destructive",
            });
        } finally {
            setRestoring(null);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${t("trash.title")} - MACHINA`} />

                <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
                    <div>
                        <h1 className="text-3xl font-bold">{t("trash.title")}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t("trash.subtitle")}
                        </p>
                    </div>

                    {loading ? (
                        <Card className="rounded-2xl">
                            <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                {t("trash.loading")}
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        {t("trash.tab.customers")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {customers.length === 0 ? (
                                        <EmptyTrash text={t("trash.noCustomers") || t("trash.noResults")} />
                                    ) : (
                                        <div className="space-y-4">
                                            {customers.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.name || t("customers.fallbackTitle")}
                                                    subtitle={`${row.email || "—"}${row.city ? ` · ${row.city}` : ""}${row.phone ? ` · ${row.phone}` : ""}`}
                                                    meta={row.deleted_at ? new Date(row.deleted_at).toLocaleString(locale) : "—"}
                                                    badge={t("trash.tab.customers")}
                                                    busy={restoringCustomerId === row.id}
                                                    restoreLabel={t("trash.restore")}
                                                    onRestore={() =>
                                                        restoreEntity("customer", row.id, row.name || row.id, setRestoringCustomerId, (id) =>
                                                            setCustomers((prev) => prev.filter((x) => x.id !== id))
                                                        )
                                                    }
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
                                        {t("trash.tab.machines")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {machines.length === 0 ? (
                                        <EmptyTrash text={t("trash.noMachines") || t("trash.noResults")} />
                                    ) : (
                                        <div className="space-y-4">
                                            {machines.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.name || t("machines.title")}
                                                    subtitle={`${row.internal_code || "—"}${row.serial_number ? ` · ${row.serial_number}` : ""}${row.brand ? ` · ${row.brand}` : ""}${row.model ? ` · ${row.model}` : ""}`}
                                                    meta={row.deleted_at ? new Date(row.deleted_at).toLocaleString(locale) : "—"}
                                                    badge={t("trash.tab.machines")}
                                                    busy={restoringMachineId === row.id}
                                                    restoreLabel={t("trash.restore")}
                                                    onRestore={() =>
                                                        restoreEntity("machine", row.id, row.name || row.id, setRestoringMachineId, (id) =>
                                                            setMachines((prev) => prev.filter((x) => x.id !== id))
                                                        )
                                                    }
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
                                        {t("trash.tab.documents")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {documents.length === 0 ? (
                                        <EmptyTrash text={t("trash.noDocuments") || t("trash.noResults")} />
                                    ) : (
                                        <div className="space-y-4">
                                            {documents.map((row) => (
                                                <TrashRow
                                                    key={row.id}
                                                    title={row.title || t("documents.title")}
                                                    subtitle={`${row.category || "—"}${row.language ? ` · ${row.language}` : ""}`}
                                                    meta={row.updated_at ? new Date(row.updated_at).toLocaleString(locale) : "—"}
                                                    badge={t("trash.tab.documents")}
                                                    busy={restoringDocumentId === row.id}
                                                    restoreLabel={t("trash.restore")}
                                                    onRestore={() =>
                                                        restoreEntity("document", row.id, row.title || row.id, setRestoringDocumentId, (id) =>
                                                            setDocuments((prev) => prev.filter((x) => x.id !== id))
                                                        )
                                                    }
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
    restoreLabel,
    onRestore,
}: {
    title: string;
    subtitle: string;
    meta: string;
    badge: string;
    busy: boolean;
    restoreLabel: string;
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
                        {restoreLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
