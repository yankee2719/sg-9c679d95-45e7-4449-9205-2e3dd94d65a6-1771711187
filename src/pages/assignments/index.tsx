import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Download,
    Factory,
    Loader2,
    MapPin,
    Plus,
    Search,
    Trash2,
    UserCheck,
    Users,
} from "lucide-react";
import { downloadCsv } from "@/lib/downloadCsv";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { userAdminApi, type AssignmentListItem, type AssignmentOptions } from "@/services/userAdminApi";
import EmptyState from "@/components/feedback/EmptyState";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasMinimumRole, normalizeRole } from "@/lib/roles";

type OrgType = "manufacturer" | "customer" | "enterprise" | null;
type AssignmentRow = AssignmentListItem;
type MachineRow = AssignmentOptions["machines"][number];
type CustomerRow = AssignmentOptions["customers"][number];
type CustomerPlantRow = AssignmentOptions["customer_plants"][number];

const copy = {
    it: {
        title: "Assegnazioni macchine",
        subtitle: "Registro delle macchine assegnate ai clienti nel contesto costruttore attivo.",
        loading: "Caricamento assegnazioni...",
        onlyManufacturer: "Il registro assegnazioni è disponibile nel contesto costruttore.",
        newAssignment: "Nuova assegnazione",
        exportCsv: "Export CSV",
        activeAssignments: "Assegnazioni attive",
        customersServed: "Clienti serviti",
        machinesAssigned: "Macchine assegnate",
        last30days: "Ultimi 30 giorni",
        searchPlaceholder: "Cerca macchina, cliente, stabilimento, area o assegnatario...",
        noResults: "Nessuna assegnazione trovata",
        noResultsDesc: "Non ci sono assegnazioni attive oppure nessun elemento corrisponde alla ricerca.",
        openCustomers: "Apri clienti",
        openMachines: "Apri macchine",
        customer: "Cliente",
        plant: "Stabilimento cliente",
        area: "Area / linea",
        assignedBy: "Assegnato da",
        assignedDate: "Data assegnazione",
        modelLabel: "Modello",
        brandLabel: "Marca",
        openMachine: "Apri macchina",
        openCustomer: "Apri cliente",
        remove: "Rimuovi",
        removeConfirm: "Sei sicuro di voler rimuovere questa assegnazione?",
        dialogTitle: "Nuova assegnazione",
        dialogDesc: "Seleziona macchina e cliente. Stabilimento e area/linea sono opzionali ma utili per ordini e contesto operativo.",
        selectMachine: "Seleziona macchina",
        selectCustomer: "Seleziona cliente",
        selectPlant: "Stabilimento cliente (opzionale)",
        areaPlaceholder: "Es. Linea 1 · Reparto presse",
        assign: "Assegna",
        assigning: "Assegnazione...",
        successTitle: "Assegnazione salvata",
        successDesc: "Macchina assegnata correttamente. Il contesto cliente/macchina è stato aggiornato.",
        errorTitle: "Errore",
        removedTitle: "Assegnazione rimossa",
        removedDesc: "L'assegnazione è stata disattivata.",
        machineContextNote: "Questo contesto verrà poi riutilizzato anche nei nuovi ordini di lavoro.",
    },
} as const;

function getLocale(language: string) {
    if (language === "en") return "en-GB";
    if (language === "fr") return "fr-FR";
    return "it-IT";
}

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function KpiCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <div className="text-sm text-muted-foreground">{title}</div>
                    <div className="mt-1 text-3xl font-semibold text-foreground">{value}</div>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-muted-foreground">{icon}</div>
            </CardContent>
        </Card>
    );
}

export default function AssignmentsIndexPage() {
    const { organization, membership, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const text = copy.it;
    const locale = getLocale(language || "it");

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < AssignmentRow[] > ([]);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [allMachines, setAllMachines] = useState < MachineRow[] > ([]);
    const [allCustomers, setAllCustomers] = useState < CustomerRow[] > ([]);
    const [allCustomerPlants, setAllCustomerPlants] = useState < CustomerPlantRow[] > ([]);
    const [selectedMachineId, setSelectedMachineId] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedCustomerPlantId, setSelectedCustomerPlantId] = useState("");
    const [areaLine, setAreaLine] = useState("");
    const [assigning, setAssigning] = useState(false);

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = normalizeRole(membership?.role ?? null);
    const canManage = hasMinimumRole(userRole, "supervisor");

    const loadAssignments = async () => {
        if (!orgId || orgType !== "manufacturer") {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const assignmentRows = await userAdminApi.listAssignments();
            setRows(Array.isArray(assignmentRows) ? assignmentRows : []);
        } catch (error) {
            console.error("Assignments load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) void loadAssignments();
    }, [authLoading, orgId, orgType]);

    const customerPlantsForSelectedCustomer = useMemo(
        () => allCustomerPlants.filter((plant) => plant.organization_id === selectedCustomerId),
        [allCustomerPlants, selectedCustomerId]
    );

    const selectedMachine = useMemo(
        () => allMachines.find((machine) => machine.id === selectedMachineId) ?? null,
        [allMachines, selectedMachineId]
    );

    const openDialog = async () => {
        setDialogOpen(true);
        setSelectedMachineId("");
        setSelectedCustomerId("");
        setSelectedCustomerPlantId("");
        setAreaLine("");

        try {
            const options = await userAdminApi.getAssignmentOptions();
            setAllMachines(options.machines ?? []);
            setAllCustomers(options.customers ?? []);
            setAllCustomerPlants(options.customer_plants ?? []);
        } catch (error) {
            console.error("Error loading dialog data:", error);
            toast({ title: text.errorTitle, description: "Impossibile caricare macchine e clienti.", variant: "destructive" });
        }
    };

    const handleMachineChange = (value: string) => {
        setSelectedMachineId(value);
        const machine = allMachines.find((entry) => entry.id === value) ?? null;
        setAreaLine(machine?.area ?? "");
    };

    const handleCustomerChange = (value: string) => {
        setSelectedCustomerId(value);
        setSelectedCustomerPlantId((current) => {
            const stillValid = allCustomerPlants.some((plant) => plant.id === current && plant.organization_id === value);
            return stillValid ? current : "";
        });
    };

    const handleAssign = async () => {
        if (!selectedMachineId || !selectedCustomerId) return;

        setAssigning(true);
        try {
            await userAdminApi.createAssignment({
                machine_id: selectedMachineId,
                customer_org_id: selectedCustomerId,
                customer_plant_id: selectedCustomerPlantId || null,
                area: areaLine,
            });

            toast({ title: text.successTitle, description: text.successDesc });
            setDialogOpen(false);
            await loadAssignments();
        } catch (error: any) {
            toast({ title: text.errorTitle, description: error?.message, variant: "destructive" });
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (assignmentId: string) => {
        if (!window.confirm(text.removeConfirm)) return;
        try {
            await userAdminApi.deleteAssignment(assignmentId);
            toast({ title: text.removedTitle, description: text.removedDesc });
            await loadAssignments();
        } catch (error: any) {
            toast({ title: text.errorTitle, description: error?.message, variant: "destructive" });
        }
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => {
            const machine = row.machine;
            const customer = row.customer;
            const user = row.assigned_user;
            const assignedByLabel = user?.display_name?.trim() || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "";
            return [
                machine?.name,
                machine?.internal_code,
                machine?.serial_number,
                machine?.model,
                machine?.brand,
                machine?.area,
                row.machine_plant?.name,
                customer?.name,
                customer?.city,
                customer?.email,
                assignedByLabel,
            ]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
    }, [rows, search]);

    const stats = useMemo(
        () => ({
            total: rows.length,
            customers: new Set(rows.map((r) => r.customer_org_id).filter(Boolean)).size,
            machines: new Set(rows.map((r) => r.machine_id)).size,
            recent30d: rows.filter((r) => r.assigned_at && Date.now() - new Date(r.assigned_at).getTime() <= 30 * 86400000).length,
        }),
        [rows]
    );

    const exportRows = filteredRows.map((row) => ({
        macchina: row.machine?.name || "",
        codice: row.machine?.internal_code || "",
        cliente: row.customer?.name || "",
        stabilimento_cliente: row.machine_plant?.name || "",
        area_linea: row.machine?.area || "",
        assegnato_da: row.assigned_user?.display_name || row.assigned_user?.email || "",
        assegnato_il: row.assigned_at || "",
    }));

    if (authLoading || loading) {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${text.title} - MACHINA`} />
                    <div className="mx-auto max-w-7xl px-4 py-8">
                        <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{text.loading}</CardContent></Card>
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    if (!orgId || orgType !== "manufacturer") {
        return (
            <OrgContextGuard>
                <MainLayout userRole={userRole}>
                    <SEO title={`${text.title} - MACHINA`} />
                    <div className="mx-auto max-w-5xl px-4 py-8">
                        <EmptyState title={text.onlyManufacturer} description="" icon={<Factory className="h-10 w-10" />} />
                    </div>
                </MainLayout>
            </OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${text.title} - MACHINA`} />
                <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">{text.title}</h1>
                            <p className="mt-2 text-sm text-muted-foreground">{text.subtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" className="rounded-2xl" onClick={() => downloadCsv(exportRows, "assignments.csv")}>
                                <Download className="mr-2 h-4 w-4" />{text.exportCsv}
                            </Button>
                            {canManage && (
                                <Button className="rounded-2xl bg-orange-500 text-white hover:bg-orange-600" onClick={openDialog}>
                                    <Plus className="mr-2 h-4 w-4" />{text.newAssignment}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <KpiCard icon={<Factory className="h-5 w-5" />} title={text.activeAssignments} value={stats.total} />
                        <KpiCard icon={<Building2 className="h-5 w-5" />} title={text.customersServed} value={stats.customers} />
                        <KpiCard icon={<Users className="h-5 w-5" />} title={text.machinesAssigned} value={stats.machines} />
                        <KpiCard icon={<UserCheck className="h-5 w-5" />} title={text.last30days} value={stats.recent30d} />
                    </div>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={text.searchPlaceholder} className="h-11 rounded-2xl pl-11" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-6">
                            {filteredRows.length === 0 ? (
                                <EmptyState
                                    title={text.noResults}
                                    description={text.noResultsDesc}
                                    icon={<Factory className="h-10 w-10" />}
                                    actionLabel={text.openCustomers}
                                    actionHref="/customers"
                                    secondaryActionLabel={text.openMachines}
                                    secondaryActionHref="/equipment"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {filteredRows.map((row) => {
                                        const machine = row.machine;
                                        const customer = row.customer;
                                        const user = row.assigned_user;
                                        const assignedByLabel = user?.display_name?.trim() || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "—";

                                        return (
                                            <div key={row.id} className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-lg font-semibold text-foreground">{machine?.name || "—"}</div>
                                                            <Badge variant="outline">{machine?.internal_code || "—"}</Badge>
                                                            {machine?.serial_number && <Badge variant="secondary">{machine.serial_number}</Badge>}
                                                        </div>
                                                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                                                            <div><span className="font-medium text-foreground">{text.customer}:</span> {customer?.name || "—"}</div>
                                                            <div><span className="font-medium text-foreground">{text.plant}:</span> {row.machine_plant?.name || "—"}</div>
                                                            <div><span className="font-medium text-foreground">{text.area}:</span> {machine?.area?.trim() || "—"}</div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span>{text.assignedBy}: {assignedByLabel}</span>
                                                            <span>{text.assignedDate}: {formatDate(row.assigned_at, locale)}</span>
                                                            {machine?.model && <span>{text.modelLabel}: {machine.model}</span>}
                                                            {machine?.brand && <span>{text.brandLabel}: {machine.brand}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Link href={`/equipment/${row.machine_id}`}><Button variant="outline" size="sm">{text.openMachine}</Button></Link>
                                                        {row.customer_org_id && <Link href={`/customers/${row.customer_org_id}`}><Button variant="outline" size="sm">{text.openCustomer}</Button></Link>}
                                                        {canManage && (
                                                            <Button variant="outline" size="sm" onClick={() => handleRemove(row.id)}>
                                                                <Trash2 className="mr-1 h-3 w-3" />{text.remove}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{text.dialogTitle}</DialogTitle>
                            <DialogDescription>{text.dialogDesc}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{text.selectMachine}</Label>
                                <Select value={selectedMachineId} onValueChange={handleMachineChange}>
                                    <SelectTrigger><SelectValue placeholder={text.selectMachine} /></SelectTrigger>
                                    <SelectContent>
                                        {allMachines.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name || "—"} {m.internal_code ? `(${m.internal_code})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{text.selectCustomer}</Label>
                                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                                    <SelectTrigger><SelectValue placeholder={text.selectCustomer} /></SelectTrigger>
                                    <SelectContent>
                                        {allCustomers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name || "—"} {c.city ? `(${c.city})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>{text.selectPlant}</Label>
                                    <Select value={selectedCustomerPlantId || "__none__"} onValueChange={(value) => setSelectedCustomerPlantId(value === "__none__" ? "" : value)}>
                                        <SelectTrigger><SelectValue placeholder={text.selectPlant} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Nessuno stabilimento</SelectItem>
                                            {customerPlantsForSelectedCustomer.map((plant) => (
                                                <SelectItem key={plant.id} value={plant.id}>{plant.name || "—"}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{text.area}</Label>
                                    <Input value={areaLine} onChange={(e) => setAreaLine(e.target.value)} placeholder={text.areaPlaceholder} />
                                </div>
                            </div>

                            {selectedMachine && (
                                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 font-medium text-foreground"><MapPin className="h-4 w-4" /> Contesto macchina corrente</div>
                                    <div className="mt-2 grid gap-1">
                                        <div>Stabilimento attuale: <span className="font-medium text-foreground">{selectedMachine.plant_id ? "già impostato" : "non impostato"}</span></div>
                                        <div>Area / linea attuale: <span className="font-medium text-foreground">{selectedMachine.area?.trim() || "—"}</span></div>
                                        <div className="pt-1 text-xs">{text.machineContextNote}</div>
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleAssign} disabled={!selectedMachineId || !selectedCustomerId || assigning} className="w-full">
                                {assigning ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{text.assigning}</>) : text.assign}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </MainLayout>
        </OrgContextGuard>
    );
}
