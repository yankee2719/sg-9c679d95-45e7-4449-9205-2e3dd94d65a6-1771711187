// src/pages/equipment/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { getPermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Wrench,
    MapPin,
    Filter,
    ChevronRight,
    ChevronDown,
    QrCode,
    Trash2,
    Building2,
    LayoutGrid,
    List,
    Factory,
    Users,
    Package,
    EyeOff,
    Eye,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Machine {
    id: string;
    name: string;
    internal_code: string | null;
    category: string | null;
    serial_number: string | null;
    model: string | null;
    brand: string | null;
    position: string | null;
    lifecycle_state: string | null;
    qr_code_token: string | null;
    plant_id: string | null;
    photo_url: string | null;
    organization_id: string | null;

    // derived
    _customerOrgId?: string | null;
    _customerName?: string | null;
    _isAssignedToCustomer?: boolean;
    _manufacturerName?: string | null;
}

interface Plant {
    id: string;
    name: string;
}

interface CustomerOrg {
    id: string;
    name: string;
}

type OrgType = "manufacturer" | "customer" | "unknown";

async function getOrgTypeById(orgId: string): Promise<OrgType> {
    const { data, error } = await supabase
        .from("organizations")
        .select("organization_type")
        .eq("id", orgId)
        .maybeSingle();

    if (error) throw error;
    const t = (data as any)?.organization_type;
    if (t === "manufacturer" || t === "customer") return t;
    return "unknown";
}

export default function EquipmentIndexPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();

    const [ctx, setCtx] = useState < UserContext | null > (null);
    const [orgType, setOrgType] = useState < OrgType > ("unknown");
    const [effectiveOrgId, setEffectiveOrgId] = useState < string | null > (null);

    const [loading, setLoading] = useState(true);

    const [machines, setMachines] = useState < Machine[] > ([]);
    const [filteredMachines, setFilteredMachines] = useState < Machine[] > ([]);

    const [plants, setPlants] = useState < Plant[] > ([]);
    const [expandedPlants, setExpandedPlants] = useState < Set < string >> (new Set());

    // manufacturer-only grouping
    const [customers, setCustomers] = useState < CustomerOrg[] > ([]);
    const [expandedCustomers, setExpandedCustomers] = useState < Set < string >> (
        new Set()
    );

    // customer-local archive (hide)
    const [hiddenMachineIds, setHiddenMachineIds] = useState < Set < string >> (
        new Set()
    );
    const [showHiddenLocal, setShowHiddenLocal] = useState(false);
    const [togglingHide, setTogglingHide] = useState < string | null > (null);

    // filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState < string > ("all");
    const [categoryFilter, setCategoryFilter] = useState < string > ("all");
    const [sourceFilter, setSourceFilter] = useState < "all" | "own" | "assigned" > (
        "all"
    );

    const [groupedView, setGroupedView] = useState(false);

    const [deleting, setDeleting] = useState < string | null > (null);

    // ---------------------------
    // LOAD
    // ---------------------------
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const userCtx = await getUserContext();
                if (!userCtx) {
                    router.push("/login");
                    return;
                }
                setCtx(userCtx);

                const orgId =
                    (userCtx as any)?.orgId ||
                    (userCtx as any)?.organizationId ||
                    (userCtx as any)?.organization_id ||
                    null;

                if (!orgId) throw new Error("Organization non trovata nel contesto utente.");
                setEffectiveOrgId(orgId);

                const type = await getOrgTypeById(orgId);
                if (!type) throw new Error("orgType non risolto");
                setOrgType(type);

                // 0) customer-only: load local hidden
                if (type === "customer") {
                    const { data: hidden, error: hiddenErr } = await supabase
                        .from("customer_hidden_machines")
                        .select("machine_id")
                        .eq("customer_org_id", orgId);

                    if (hiddenErr) throw hiddenErr;
                    setHiddenMachineIds(
                        new Set((hidden ?? []).map((r: any) => r.machine_id))
                    );
                } else {
                    setHiddenMachineIds(new Set());
                }

                // 1) carico macchine visibili (RLS decide cosa vedi)
                const { data: machineData, error: machineErr } = await supabase
                    .from("machines")
                    .select(
                        "id, name, internal_code, category, serial_number, model, brand, position, lifecycle_state, qr_code_token, plant_id, photo_url, organization_id"
                    )
                    .eq("is_archived", false)
                    .order("name");

                if (machineErr) throw machineErr;

                let allMachines = (machineData ?? []) as Machine[];

                // customer: carico assignment per capire "assigned"
                if (type === "customer") {
                    const { data: assigns, error: assErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, manufacturer_org_id, customer_org_id, is_active")
                        .eq("customer_org_id", orgId)
                        .eq("is_active", true);

                    if (assErr) throw assErr;

                    const assignedIds = new Set((assigns ?? []).map((a: any) => a.machine_id));

                    // mark assigned
                    allMachines = allMachines.map((m) => ({
                        ...m,
                        _isAssignedToCustomer: assignedIds.has(m.id),
                        _customerOrgId: orgId,
                    }));

                    // Manufacturer name for assigned
                    const mfrOrgIds = [
                        ...new Set(
                            allMachines
                                .filter((m) => m._isAssignedToCustomer)
                                .map((m) => m.organization_id)
                                .filter(Boolean)
                        ),
                    ] as string[];

                    if (mfrOrgIds.length > 0) {
                        const { data: mfrOrgs, error: mfrErr } = await supabase
                            .from("organizations")
                            .select("id, name")
                            .in("id", mfrOrgIds);

                        if (mfrErr) throw mfrErr;

                        const mfrMap = new Map((mfrOrgs ?? []).map((o: any) => [o.id, o.name]));
                        allMachines = allMachines.map((m) => ({
                            ...m,
                            _manufacturerName:
                                m._isAssignedToCustomer && m.organization_id
                                    ? mfrMap.get(m.organization_id) || null
                                    : null,
                        }));
                    }

                    // plants list for grouping
                    const { data: plantsData } = await supabase
                        .from("plants")
                        .select("id, name")
                        .eq("is_archived", false)
                        .order("name");

                    setPlants((plantsData ?? []) as Plant[]);
                    setGroupedView(true);
                }

                // manufacturer: customers list for grouping
                if (type === "manufacturer") {
                    // assignments to customers
                    const { data: assigns, error: assErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, customer_org_id, is_active")
                        .eq("manufacturer_org_id", orgId)
                        .eq("is_active", true);

                    if (assErr) throw assErr;

                    const byMachine = new Map < string, string> ();
                    for (const a of assigns ?? []) {
                        if (a.machine_id && a.customer_org_id) byMachine.set(a.machine_id, a.customer_org_id);
                    }

                    allMachines = allMachines.map((m) => ({
                        ...m,
                        _customerOrgId: byMachine.get(m.id) || null,
                        _isAssignedToCustomer: !!byMachine.get(m.id),
                    }));

                    const customerOrgIds = [
                        ...new Set(
                            (assigns ?? [])
                                .map((a: any) => a.customer_org_id)
                                .filter(Boolean)
                        ),
                    ] as string[];

                    if (customerOrgIds.length > 0) {
                        const { data: custOrgs, error: custErr } = await supabase
                            .from("organizations")
                            .select("id, name")
                            .in("id", customerOrgIds)
                            .order("name");

                        if (custErr) throw custErr;
                        setCustomers((custOrgs ?? []) as CustomerOrg[]);
                    }

                    setGroupedView(true);
                }

                setMachines(allMachines);
            } catch (error: any) {
                console.error(error);
                toast({
                    title: "Errore",
                    description: error?.message || "Errore nel caricamento",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const perms = useMemo(() => {
        if (!ctx) return null;
        return getPermissions({ role: ctx.role, orgType: orgType as any });
    }, [ctx, orgType]);

    const isAdmin = perms?.isAdminOrSupervisor ?? false;
    const isCustomer = orgType === "customer";
    const isManufacturer = orgType === "manufacturer";

    // ---------------------------
    // ACTIONS
    // ---------------------------
    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`Sei sicuro di voler eliminare "${name}"?`)) return;
        setDeleting(id);
        try {
            const { error } = await supabase.from("machines").delete().eq("id", id);
            if (error) throw error;

            setMachines((prev) => prev.filter((m) => m.id !== id));
            toast({ title: "Eliminato", description: `"${name}" eliminato` });
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error?.message || "Errore",
                variant: "destructive",
            });
        } finally {
            setDeleting(null);
        }
    };

    const toggleHideLocal = async (e: React.MouseEvent, machineId: string) => {
        e.stopPropagation();
        if (!isCustomer || !effectiveOrgId) return;
        if (!isAdmin) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono archiviare.",
                variant: "destructive",
            });
            return;
        }

        setTogglingHide(machineId);
        try {
            const isHidden = hiddenMachineIds.has(machineId);

            if (isHidden) {
                const { error } = await supabase
                    .from("customer_hidden_machines")
                    .delete()
                    .eq("customer_org_id", effectiveOrgId)
                    .eq("machine_id", machineId);
                if (error) throw error;

                setHiddenMachineIds((prev) => {
                    const n = new Set(prev);
                    n.delete(machineId);
                    return n;
                });

                toast({
                    title: "Ripristinata",
                    description: "Macchina ripristinata nella lista.",
                });
            } else {
                const { error } = await supabase
                    .from("customer_hidden_machines")
                    .insert({ customer_org_id: effectiveOrgId, machine_id: machineId });
                if (error) throw error;

                setHiddenMachineIds((prev) => {
                    const n = new Set(prev);
                    n.add(machineId);
                    return n;
                });

                toast({
                    title: "Archiviata",
                    description: "Macchina archiviata localmente (solo per questo cliente).",
                });
            }
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Errore",
                description: err?.message ?? "Errore",
                variant: "destructive",
            });
        } finally {
            setTogglingHide(null);
        }
    };

    // ---------------------------
    // FILTER
    // ---------------------------
    useEffect(() => {
        let filtered = machines;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (m) =>
                    m.name?.toLowerCase().includes(q) ||
                    (m.internal_code ?? "").toLowerCase().includes(q) ||
                    (m.serial_number ?? "").toLowerCase().includes(q) ||
                    (m.position ?? "").toLowerCase().includes(q) ||
                    (m.brand ?? "").toLowerCase().includes(q)
            );
        }

        if (statusFilter !== "all")
            filtered = filtered.filter((m) => m.lifecycle_state === statusFilter);
        if (categoryFilter !== "all")
            filtered = filtered.filter((m) => m.category === categoryFilter);

        // customer-only filter: provenance
        if (orgType === "customer") {
            if (sourceFilter === "own")
                filtered = filtered.filter((m) => !m._isAssignedToCustomer);
            if (sourceFilter === "assigned")
                filtered = filtered.filter((m) => !!m._isAssignedToCustomer);

            // customer-only: hide locally (for BOTH own + assigned)
            if (!showHiddenLocal && hiddenMachineIds.size > 0) {
                filtered = filtered.filter((m) => !hiddenMachineIds.has(m.id));
            }
        }

        setFilteredMachines(filtered);
    }, [
        machines,
        searchQuery,
        statusFilter,
        categoryFilter,
        sourceFilter,
        orgType,
        hiddenMachineIds,
        showHiddenLocal,
    ]);

    const categories = useMemo(() => {
        const set = new Set < string > ();
        for (const m of machines) if (m.category) set.add(m.category);
        return Array.from(set).sort();
    }, [machines]);

    const statuses = useMemo(() => {
        const set = new Set < string > ();
        for (const m of machines) if (m.lifecycle_state) set.add(m.lifecycle_state);
        return Array.from(set).sort();
    }, [machines]);

    const groupedByPlant = useMemo(() => {
        const map = new Map < string, Machine[]> ();
        for (const m of filteredMachines) {
            const key = m.plant_id ?? "no-plant";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(m);
        }
        // sort machines in each plant
        for (const [k, arr] of map.entries()) {
            map.set(
                k,
                arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            );
        }
        return map;
    }, [filteredMachines]);

    const groupedByCustomer = useMemo(() => {
        const map = new Map < string, Machine[]> ();
        for (const m of filteredMachines) {
            const key = m._customerOrgId ?? "unassigned";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(m);
        }
        for (const [k, arr] of map.entries()) {
            map.set(
                k,
                arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            );
        }
        return map;
    }, [filteredMachines]);

    const plantName = (plantId: string) => {
        if (plantId === "no-plant") return "Senza stabilimento";
        return plants.find((p) => p.id === plantId)?.name || "Stabilimento";
    };

    const customerName = (customerOrgId: string) => {
        if (customerOrgId === "unassigned") return "Non assegnate";
        return customers.find((c) => c.id === customerOrgId)?.name || "Cliente";
    };

    const toggleExpandedPlant = (id: string) => {
        setExpandedPlants((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleExpandedCustomer = (id: string) => {
        setExpandedCustomers((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const canDelete = isManufacturer && isAdmin;
    const canLocalArchive = isCustomer && isAdmin;

    const renderMachineCard = (item: Machine) => {
        const isHiddenLocal = hiddenMachineIds.has(item.id);

        return (
            <Card
                key={item.id}
                className="group cursor-pointer hover:border-[#FF6B35]/40 transition-colors"
                onClick={() => router.push(`/equipment/${item.id}`)}
            >
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                            <p className="text-xs text-muted-foreground truncate font-mono">
                                {item.internal_code ?? "—"}
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {item.qr_code_token && (
                                <div className="p-1 rounded-md bg-muted/60">
                                    <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                            )}

                            {/* Customer: local archive/unarchive */}
                            {canLocalArchive && (
                                <button
                                    onClick={(e) => toggleHideLocal(e, item.id)}
                                    disabled={togglingHide === item.id}
                                    title={isHiddenLocal ? "Ripristina" : "Archivia localmente"}
                                    className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                >
                                    {isHiddenLocal ? (
                                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                    ) : (
                                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                </button>
                            )}

                            {/* Manufacturer: real delete */}
                            {canDelete && (
                                <button
                                    onClick={(e) => handleDelete(e, item.id, item.name)}
                                    disabled={deleting === item.id}
                                    title="Elimina"
                                    className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            )}

                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.category && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                                <Package className="w-3 h-3 mr-1" />
                                {item.category}
                            </Badge>
                        )}

                        {isCustomer && item._isAssignedToCustomer && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
                                <Factory className="w-3 h-3 mr-1" />
                                {item._manufacturerName || "Costruttore"}
                            </Badge>
                        )}

                        {isCustomer && isHiddenLocal && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                                Archiviata (locale)
                            </Badge>
                        )}
                    </div>

                    {item.position && (
                        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{item.position}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <MainLayout>
                <SEO title={t("equipment.title")} />
                <div className="p-6">{t("common.loading")}</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <SEO title={t("equipment.title")} />
            <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">{t("equipment.title")}</h1>
                        <p className="text-muted-foreground">{t("equipment.subtitle")}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {(isCustomer || isManufacturer) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGroupedView((v) => !v)}
                                className="border-border"
                                title="Cambia visualizzazione"
                            >
                                {groupedView ? (
                                    <LayoutGrid className="w-4 h-4" />
                                ) : (
                                    <List className="w-4 h-4" />
                                )}
                                <span className="ml-2 hidden sm:inline">
                                    {groupedView ? "Griglia" : "Per stabilimento"}
                                </span>
                            </Button>
                        )}

                        {/* customer: show hidden local */}
                        {orgType === "customer" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowHiddenLocal((v) => !v)}
                                className="border-border"
                                title={
                                    showHiddenLocal
                                        ? "Nascondi le macchine archiviate localmente"
                                        : "Mostra le macchine archiviate localmente"
                                }
                            >
                                {showHiddenLocal ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                                <span className="ml-2 hidden sm:inline">
                                    {showHiddenLocal ? "Nascondi archiviate" : "Mostra archiviate"}
                                </span>
                            </Button>
                        )}

                        {/* create */}
                        {isAdmin && (
                            <Button
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                onClick={() => router.push("/equipment/new")}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t("equipment.new")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* FILTER BAR */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("common.search")}
                                    className="pl-9"
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                    <Filter className="w-4 h-4" />
                                    <span>{t("common.filter")}</span>
                                </div>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Stato" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("common.all")}</SelectItem>
                                        {statuses.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px]">
                                        <SelectValue placeholder="Categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("common.all")}</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {orgType === "customer" && (
                                    <Select
                                        value={sourceFilter}
                                        onValueChange={(v) => setSourceFilter(v as any)}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Provenienza" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutte</SelectItem>
                                            <SelectItem value="own">Solo mie</SelectItem>
                                            <SelectItem value="assigned">Assegnate da costruttore</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* LIST */}
                {!groupedView ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredMachines.map(renderMachineCard)}
                        {filteredMachines.length === 0 && (
                            <div className="text-sm text-muted-foreground">
                                {t("equipment.noEquipment")}
                            </div>
                        )}
                    </div>
                ) : isCustomer ? (
                    <div className="space-y-3">
                        {Array.from(groupedByPlant.entries())
                            .sort((a, b) => plantName(a[0]).localeCompare(plantName(b[0])))
                            .map(([plantId, list]) => {
                                const open = expandedPlants.has(plantId);
                                return (
                                    <Card key={plantId}>
                                        <CardContent className="p-4">
                                            <button
                                                className="w-full flex items-center justify-between"
                                                onClick={() => toggleExpandedPlant(plantId)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold">{plantName(plantId)}</span>
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {list.length}
                                                    </Badge>
                                                </div>
                                                {open ? (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </button>

                                            {open && (
                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                    {list.map(renderMachineCard)}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {Array.from(groupedByCustomer.entries())
                            .sort((a, b) => customerName(a[0]).localeCompare(customerName(b[0])))
                            .map(([custOrgId, list]) => {
                                const open = expandedCustomers.has(custOrgId);
                                return (
                                    <Card key={custOrgId}>
                                        <CardContent className="p-4">
                                            <button
                                                className="w-full flex items-center justify-between"
                                                onClick={() => toggleExpandedCustomer(custOrgId)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold">{customerName(custOrgId)}</span>
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {list.length}
                                                    </Badge>
                                                </div>
                                                {open ? (
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </button>

                                            {open && (
                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                    {list.map(renderMachineCard)}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}