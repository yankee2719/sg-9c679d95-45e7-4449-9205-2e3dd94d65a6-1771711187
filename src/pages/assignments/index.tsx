import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Download,
    Factory,
    Loader2,
    Plus,
    Search,
    Trash2,
    UserCheck,
    Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/services/apiClient";
import { downloadCsv } from "@/lib/downloadCsv";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import EmptyState from "@/components/feedback/EmptyState";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type OrgType = "manufacturer" | "customer" | null;

interface AssignmentRow {
    id: string;
    machine_id: string;
    customer_org_id: string | null;
    manufacturer_org_id: string | null;
    assigned_by: string | null;
    assigned_at: string | null;
    is_active: boolean;
}

interface MachineRow {
    id: string;
    name: string | null;
    internal_code: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
}

interface CustomerRow {
    id: string;
    name: string | null;
    city: string | null;
    email: string | null;
}

interface ProfileRow {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

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
        searchPlaceholder: "Cerca macchina, cliente, assegnatario...",
        noResults: "Nessuna assegnazione trovata",
        noResultsDesc: "Non ci sono assegnazioni attive oppure nessun elemento corrisponde alla ricerca.",
        openCustomers: "Apri clienti",
        openMachines: "Apri macchine",
        customer: "Cliente",
        assignedBy: "Assegnato da",
        assignedDate: "Data assegnazione",
        modelLabel: "Modello",
        brandLabel: "Marca",
        openMachine: "Apri macchina",
        openCustomer: "Apri cliente",
        remove: "Rimuovi",
        removeConfirm: "Sei sicuro di voler rimuovere questa assegnazione?",
        dialogTitle: "Nuova assegnazione",
        dialogDesc: "Seleziona una macchina e un cliente per creare l'assegnazione.",
        selectMachine: "Seleziona macchina",
        selectCustomer: "Seleziona cliente",
        assign: "Assegna",
        assigning: "Assegnazione...",
        successTitle: "Assegnazione creata",
        successDesc: "La macchina è stata assegnata al cliente.",
        errorTitle: "Errore",
        removedTitle: "Assegnazione rimossa",
        removedDesc: "L'assegnazione è stata disattivata.",
    },
    en: {
        title: "Machine assignments",
        subtitle: "Registry of machines assigned to customers in the active manufacturer context.",
        loading: "Loading assignments...",
        onlyManufacturer: "The assignment registry is available in manufacturer context.",
        newAssignment: "New assignment",
        exportCsv: "Export CSV",
        activeAssignments: "Active assignments",
        customersServed: "Customers served",
        machinesAssigned: "Machines assigned",
        last30days: "Last 30 days",
        searchPlaceholder: "Search machine, customer, assignee...",
        noResults: "No assignments found",
        noResultsDesc: "No active assignments or no items match the search.",
        openCustomers: "Open customers",
        openMachines: "Open machines",
        customer: "Customer",
        assignedBy: "Assigned by",
        assignedDate: "Assignment date",
        modelLabel: "Model",
        brandLabel: "Brand",
        openMachine: "Open machine",
        openCustomer: "Open customer",
        remove: "Remove",
        removeConfirm: "Are you sure you want to remove this assignment?",
        dialogTitle: "New assignment",
        dialogDesc: "Select a machine and a customer to create the assignment.",
        selectMachine: "Select machine",
        selectCustomer: "Select customer",
        assign: "Assign",
        assigning: "Assigning...",
        successTitle: "Assignment created",
        successDesc: "The machine has been assigned to the customer.",
        errorTitle: "Error",
        removedTitle: "Assignment removed",
        removedDesc: "The assignment has been deactivated.",
    },
    fr: {
        title: "Affectations machines",
        subtitle: "Registre des machines affectées aux clients dans le contexte constructeur actif.",
        loading: "Chargement des affectations...",
        onlyManufacturer: "Le registre des affectations est disponible dans le contexte constructeur.",
        newAssignment: "Nouvelle affectation",
        exportCsv: "Export CSV",
        activeAssignments: "Affectations actives",
        customersServed: "Clients servis",
        machinesAssigned: "Machines affectées",
        last30days: "30 derniers jours",
        searchPlaceholder: "Rechercher machine, client, assigneur...",
        noResults: "Aucune affectation trouvée",
        noResultsDesc: "Aucune affectation active ou aucun élément ne correspond à la recherche.",
        openCustomers: "Ouvrir les clients",
        openMachines: "Ouvrir les machines",
        customer: "Client",
        assignedBy: "Affecté par",
        assignedDate: "Date d'affectation",
        modelLabel: "Modèle",
        brandLabel: "Marque",
        openMachine: "Ouvrir la machine",
        openCustomer: "Ouvrir le client",
        remove: "Supprimer",
        removeConfirm: "Êtes-vous sûr de vouloir supprimer cette affectation ?",
        dialogTitle: "Nouvelle affectation",
        dialogDesc: "Sélectionnez une machine et un client pour créer l'affectation.",
        selectMachine: "Sélectionner une machine",
        selectCustomer: "Sélectionner un client",
        assign: "Affecter",
        assigning: "Affectation...",
        successTitle: "Affectation créée",
        successDesc: "La machine a été affectée au client.",
        errorTitle: "Erreur",
        removedTitle: "Affectation supprimée",
        removedDesc: "L'affectation a été désactivée.",
    },
    es: {
        title: "Asignaciones de máquinas",
        subtitle: "Registro de máquinas asignadas a clientes en el contexto fabricante activo.",
        loading: "Cargando asignaciones...",
        onlyManufacturer: "El registro de asignaciones está disponible en el contexto fabricante.",
        newAssignment: "Nueva asignación",
        exportCsv: "Export CSV",
        activeAssignments: "Asignaciones activas",
        customersServed: "Clientes servidos",
        machinesAssigned: "Máquinas asignadas",
        last30days: "Últimos 30 días",
        searchPlaceholder: "Buscar máquina, cliente, asignador...",
        noResults: "No se encontraron asignaciones",
        noResultsDesc: "No hay asignaciones activas o ningún elemento coincide con la búsqueda.",
        openCustomers: "Abrir clientes",
        openMachines: "Abrir máquinas",
        customer: "Cliente",
        assignedBy: "Asignado por",
        assignedDate: "Fecha de asignación",
        modelLabel: "Modelo",
        brandLabel: "Marca",
        openMachine: "Abrir máquina",
        openCustomer: "Abrir cliente",
        remove: "Eliminar",
        removeConfirm: "¿Estás seguro de que quieres eliminar esta asignación?",
        dialogTitle: "Nueva asignación",
        dialogDesc: "Selecciona una máquina y un cliente para crear la asignación.",
        selectMachine: "Seleccionar máquina",
        selectCustomer: "Seleccionar cliente",
        assign: "Asignar",
        assigning: "Asignando...",
        successTitle: "Asignación creada",
        successDesc: "La máquina ha sido asignada al cliente.",
        errorTitle: "Error",
        removedTitle: "Asignación eliminada",
        removedDesc: "La asignación ha sido desactivada.",
    },
} as const;

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString(locale, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

function getLocale(language: string) {
    switch (language) {
        case "fr": return "fr-FR";
        case "es": return "es-ES";
        case "en": return "en-GB";
        default: return "it-IT";
    }
}

function KpiCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) {
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    {icon}
                </div>
                <div className="text-4xl font-bold text-foreground">{value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{title}</div>
            </CardContent>
        </Card>
    );
}

export default function AssignmentsIndexPage() {
    const { loading: authLoading, organization, membership } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const text = copy[(language as keyof typeof copy) || "it"] ?? copy.it;
    const locale = getLocale(language);

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState < AssignmentRow[] > ([]);
    const [machineMap, setMachineMap] = useState < Map < string, MachineRow>> (new Map());
    const [customerMap, setCustomerMap] = useState < Map < string, CustomerRow>> (new Map());
    const [userMap, setUserMap] = useState < Map < string, ProfileRow>> (new Map());
    const [search, setSearch] = useState("");

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [allMachines, setAllMachines] = useState < MachineRow[] > ([]);
    const [allCustomers, setAllCustomers] = useState < CustomerRow[] > ([]);
    const [selectedMachineId, setSelectedMachineId] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [assigning, setAssigning] = useState(false);

    const orgId = organization?.id ?? null;
    const orgType = (organization?.type as OrgType | undefined) ?? null;
    const userRole = membership?.role ?? "technician";
    const canManage = ["owner", "admin", "supervisor"].includes(userRole);

    const loadAssignments = async () => {
        if (!orgId || orgType !== "manufacturer") {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const { data: assignments, error: assignmentsError } = await supabase
                .from("machine_assignments")
                .select("id, machine_id, customer_org_id, manufacturer_org_id, assigned_by, assigned_at, is_active")
                .eq("manufacturer_org_id", orgId)
                .eq("is_active", true)
                .order("assigned_at", { ascending: false });

            if (assignmentsError) throw assignmentsError;

            const assignmentRows = (assignments ?? []) as AssignmentRow[];

            const machineIds = Array.from(new Set(assignmentRows.map((r) => r.machine_id).filter(Boolean)));
            const customerIds = Array.from(new Set(assignmentRows.map((r) => r.customer_org_id).filter(Boolean))) as string[];
            const userIds = Array.from(new Set(assignmentRows.map((r) => r.assigned_by).filter(Boolean))) as string[];

            let nextMachineMap = new Map < string, MachineRow> ();
            let nextCustomerMap = new Map < string, CustomerRow> ();
            let nextUserMap = new Map < string, ProfileRow> ();

            if (machineIds.length > 0) {
                const { data } = await supabase.from("machines").select("id, name, internal_code, serial_number, model, brand").in("id", machineIds);
                nextMachineMap = new Map(((data ?? []) as MachineRow[]).map((r) => [r.id, r]));
            }
            if (customerIds.length > 0) {
                const { data } = await supabase.from("organizations").select("id, name, city, email").in("id", customerIds);
                nextCustomerMap = new Map(((data ?? []) as CustomerRow[]).map((r) => [r.id, r]));
            }
            if (userIds.length > 0) {
                const { data } = await supabase.from("profiles").select("id, display_name, first_name, last_name, email").in("id", userIds);
                nextUserMap = new Map(((data ?? []) as ProfileRow[]).map((r) => [r.id, r]));
            }

            setRows(assignmentRows);
            setMachineMap(nextMachineMap);
            setCustomerMap(nextCustomerMap);
            setUserMap(nextUserMap);
        } catch (error) {
            console.error("Assignments load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        if (!authLoading) void loadAssignments();
        return () => { active = false; };
    }, [authLoading, orgId, orgType]);

    // Load machines and customers when dialog opens
    const openDialog = async () => {
        setDialogOpen(true);
        setSelectedMachineId("");
        setSelectedCustomerId("");

        try {
            const [machinesRes, customersRes] = await Promise.all([
                supabase.from("machines").select("id, name, internal_code, serial_number, model, brand")
                    .eq("organization_id", orgId!)
                    .eq("is_archived", false)
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .order("name"),
                supabase.from("organizations").select("id, name, city, email")
                    .eq("manufacturer_org_id", orgId!)
                    .eq("type", "customer")
                    .or("is_deleted.is.null,is_deleted.eq.false")
                    .order("name"),
            ]);

            setAllMachines((machinesRes.data ?? []) as MachineRow[]);
            setAllCustomers((customersRes.data ?? []) as CustomerRow[]);
        } catch (error) {
            console.error("Error loading dialog data:", error);
        }
    };

    const handleAssign = async () => {
        if (!selectedMachineId || !selectedCustomerId) return;

        setAssigning(true);
        try {
            await apiFetch("/api/assignments", {
                method: "POST",
                body: JSON.stringify({
                    machine_id: selectedMachineId,
                    customer_org_id: selectedCustomerId,
                }),
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
            await apiFetch("/api/assignments", {
                method: "DELETE",
                body: JSON.stringify({ assignment_id: assignmentId }),
            });

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
            const machine = machineMap.get(row.machine_id);
            const customer = row.customer_org_id ? customerMap.get(row.customer_org_id) : null;
            const user = row.assigned_by ? userMap.get(row.assigned_by) : null;
            const assignedByLabel = user?.display_name?.trim() || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "";
            return [machine?.name, machine?.internal_code, machine?.serial_number, machine?.model, machine?.brand, customer?.name, customer?.city, customer?.email, assignedByLabel]
                .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
        });
    }, [rows, search, machineMap, customerMap, userMap]);

    const stats = useMemo(() => ({
        total: rows.length,
        customers: new Set(rows.map((r) => r.customer_org_id).filter(Boolean)).size,
        machines: new Set(rows.map((r) => r.machine_id)).size,
        recent30d: rows.filter((r) => r.assigned_at && Date.now() - new Date(r.assigned_at).getTime() <= 30 * 86400000).length,
    }), [rows]);

    if (authLoading || loading) {
        return (
            <OrgContextGuard><MainLayout userRole={userRole}><SEO title={`${text.title} - MACHINA`} />
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{text.loading}</CardContent></Card>
                </div>
            </MainLayout></OrgContextGuard>
        );
    }

    if (!orgId || orgType !== "manufacturer") {
        return (
            <OrgContextGuard><MainLayout userRole={userRole}><SEO title={`${text.title} - MACHINA`} />
                <div className="mx-auto max-w-7xl px-4 py-8">
                    <Card className="rounded-2xl"><CardContent className="py-10 text-center text-muted-foreground">{text.onlyManufacturer}</CardContent></Card>
                </div>
            </MainLayout></OrgContextGuard>
        );
    }

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${text.title} - MACHINA`} />

                <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{text.title}</h1>
                            <p className="text-base text-muted-foreground">{text.subtitle}</p>
                        </div>

                        <div className="flex gap-3">
                            {canManage && (
                                <Button onClick={openDialog}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {text.newAssignment}
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => downloadCsv("/api/export/assignments", "assegnazioni.csv")}>
                                <Download className="mr-2 h-4 w-4" />
                                {text.exportCsv}
                            </Button>
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
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={text.searchPlaceholder}
                                    className="h-11 w-full rounded-2xl border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                />
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
                                        const machine = machineMap.get(row.machine_id);
                                        const customer = row.customer_org_id ? customerMap.get(row.customer_org_id) : null;
                                        const user = row.assigned_by ? userMap.get(row.assigned_by) : null;
                                        const assignedByLabel = user?.display_name?.trim() || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "—";

                                        return (
                                            <div key={row.id} className="rounded-2xl border border-border p-4 transition hover:bg-muted/30">
                                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                    <div className="min-w-0 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-lg font-semibold text-foreground">{machine?.name || "—"}</div>
                                                            <Badge variant="outline">{machine?.internal_code || "—"}</Badge>
                                                            {machine?.serial_number && <Badge variant="secondary">{machine.serial_number}</Badge>}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {text.customer}: {customer?.name || "—"}
                                                            {customer?.city ? ` · ${customer.city}` : ""}
                                                            {customer?.email ? ` · ${customer.email}` : ""}
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                            <span>{text.assignedBy}: {assignedByLabel}</span>
                                                            <span>{text.assignedDate}: {formatDate(row.assigned_at, locale)}</span>
                                                            {machine?.model && <span>{text.modelLabel}: {machine.model}</span>}
                                                            {machine?.brand && <span>{text.brandLabel}: {machine.brand}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Link href={`/equipment/${row.machine_id}`}>
                                                            <Button variant="outline" size="sm">{text.openMachine}</Button>
                                                        </Link>
                                                        {row.customer_org_id && (
                                                            <Link href={`/customers/${row.customer_org_id}`}>
                                                                <Button variant="outline" size="sm">{text.openCustomer}</Button>
                                                            </Link>
                                                        )}
                                                        {canManage && (
                                                            <Button variant="outline" size="sm" onClick={() => handleRemove(row.id)}>
                                                                <Trash2 className="mr-1 h-3 w-3" />
                                                                {text.remove}
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

                {/* Dialog nuova assegnazione */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{text.dialogTitle}</DialogTitle>
                            <DialogDescription>{text.dialogDesc}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>{text.selectMachine}</Label>
                                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={text.selectMachine} />
                                    </SelectTrigger>
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
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={text.selectCustomer} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allCustomers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name || "—"} {c.city ? `(${c.city})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleAssign}
                                disabled={!selectedMachineId || !selectedCustomerId || assigning}
                                className="w-full"
                            >
                                {assigning ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{text.assigning}</>
                                ) : (
                                    text.assign
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </MainLayout>
        </OrgContextGuard>
    );
}
