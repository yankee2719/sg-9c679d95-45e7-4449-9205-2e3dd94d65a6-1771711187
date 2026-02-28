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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Machine {
    id: string;
    name: string;
    internal_code: string;
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

    // customer-view helpers
    _isAssigned?: boolean;
    _manufacturerName?: string | null;

    // manufacturer-view helpers
    _customerId?: string | null;
    _customerName?: string | null;
    _ownerOrgType?: "manufacturer" | "customer" | null;
}

interface Plant {
    id: string;
    name: string;
}

type OrgMini = { id: string; name: string; type: "manufacturer" | "customer" };

async function getOrgTypeById(orgId: string): Promise<"manufacturer" | "customer" | null> {
    const { data, error } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", orgId)
        .maybeSingle();

    if (error) throw error;
    const tRaw = String((data as any)?.type ?? "").toLowerCase();
    if (tRaw === "manufacturer") return "manufacturer";
    if (tRaw === "customer") return "customer";
    return null;
}

export default function EquipmentPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState < UserContext | null > (null);

    // DB-truth (do not trust ctx.orgType)
    const [orgType, setOrgType] = useState < "manufacturer" | "customer" | null > (null);
    const [orgId, setOrgId] = useState < string | null > (null);

    const [machines, setMachines] = useState < Machine[] > ([]);
    const [filteredMachines, setFilteredMachines] = useState < Machine[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all"); // customer only: all | own | assigned
    const [categories, setCategories] = useState < string[] > ([]);
    const [deleting, setDeleting] = useState < string | null > (null);

    // customer grouping
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [expandedPlants, setExpandedPlants] = useState < Set < string >> (new Set());

    // manufacturer grouping
    const [expandedCustomers, setExpandedCustomers] = useState < Set < string >> (new Set());

    // view mode (customer: plant vs grid, manufacturer: customer vs grid)
    const [groupedView, setGroupedView] = useState(false);

    // =========================
    // LOAD DATA (HARD GUARDED)
    // =========================
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

                const effectiveOrgId =
                    (userCtx as any)?.orgId ||
                    (userCtx as any)?.organizationId ||
                    (userCtx as any)?.organization_id ||
                    null;

                if (!effectiveOrgId) throw new Error("Organization non trovata nel contesto utente.");
                setOrgId(effectiveOrgId);

                const type = await getOrgTypeById(effectiveOrgId);

                // HARD FAIL: niente UI random
                if (!type) throw new Error("orgType non risolto (organizations.type nullo o RLS).");
                setOrgType(type);

                // 1) Load machines (RLS decides visibility)
                const { data: machineData, error: machineErr } = await supabase
                    .from("machines")
                    .select("*")
                    .order("name");

                if (machineErr) throw machineErr;

                let allMachines: Machine[] = (machineData ?? []) as any;

                // -------------------------
                // CUSTOMER MODE
                // -------------------------
                if (type === "customer") {
                    // Mark assigned machines (from manufacturers) using assignments table
                    const { data: assignments, error: asgErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, manufacturer_org_id")
                        .eq("customer_org_id", effectiveOrgId)
                        .eq("is_active", true);

                    if (asgErr) throw asgErr;

                    const assignedIds = new Set((assignments ?? []).map((a: any) => a.machine_id));

                    // _isAssigned = true if assignment exists AND machine is not owned by customer org
                    allMachines = allMachines.map((m: any) => ({
                        ...m,
                        _isAssigned: assignedIds.has(m.id) && m.organization_id !== effectiveOrgId,
                    }));

                    // manufacturer name for assigned ones
                    const mfrOrgIds = [
                        ...new Set(
                            allMachines
                                .filter((m: any) => m._isAssigned)
                                .map((m: any) => m.organization_id)
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
                        allMachines = allMachines.map((m: any) => ({
                            ...m,
                            _manufacturerName:
                                m._isAssigned && m.organization_id ? mfrMap.get(m.organization_id) ?? null : null,
                        }));
                    }

                    // Plants list for grouping
                    const { data: plantsData } = await supabase
                        .from("plants")
                        .select("id, name")
                        .eq("is_archived", false)
                        .order("name");

                    setPlants((plantsData ?? []) as any);
                    setExpandedPlants(new Set((plantsData ?? []).map((p: any) => p.id)));

                    // Default: if any plant exists → grouped by plant
                    const hasAnyPlantLink = allMachines.some((m: any) => !!m.plant_id);
                    setGroupedView(hasAnyPlantLink);
                    setExpandedCustomers(new Set()); // irrelevant in customer mode
                }

                // -------------------------
                // MANUFACTURER MODE
                // -------------------------
                if (type === "manufacturer") {
                    // Fetch owner org info for all visible machines (to detect customer-owned machines)
                    const ownerOrgIds = [
                        ...new Set(allMachines.map((m: any) => m.organization_id).filter(Boolean)),
                    ] as string[];

                    const ownerMap = new Map < string, OrgMini> ();
                    if (ownerOrgIds.length > 0) {
                        const { data: ownerOrgs, error: ownerErr } = await supabase
                            .from("organizations")
                            .select("id,name,type")
                            .in("id", ownerOrgIds);

                        if (ownerErr) throw ownerErr;

                        (ownerOrgs ?? []).forEach((o: any) => {
                            const tRaw = String(o.type ?? "").toLowerCase();
                            const t = tRaw === "customer" ? "customer" : "manufacturer";
                            ownerMap.set(o.id, { id: o.id, name: o.name, type: t });
                        });
                    }

                    // Fetch active assignments for THIS manufacturer
                    const { data: asgData, error: asgErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, customer_org_id")
                        .eq("manufacturer_org_id", effectiveOrgId)
                        .eq("is_active", true);

                    if (asgErr) throw asgErr;

                    const asgMap = new Map < string, string> ();
                    const customerIdsFromAsg = new Set < string > ();
                    (asgData ?? []).forEach((a: any) => {
                        if (a?.machine_id && a?.customer_org_id) {
                            asgMap.set(a.machine_id, a.customer_org_id);
                            customerIdsFromAsg.add(a.customer_org_id);
                        }
                    });

                    // Load customer names (from assignment)
                    const customerNameMap = new Map < string, string> ();
                    const customerIdsList = Array.from(customerIdsFromAsg);
                    if (customerIdsList.length > 0) {
                        const { data: custOrgs, error: custErr } = await supabase
                            .from("organizations")
                            .select("id,name")
                            .in("id", customerIdsList);

                        if (custErr) throw custErr;
                        (custOrgs ?? []).forEach((c: any) => customerNameMap.set(c.id, c.name));
                    }

                    // Compute customer bucket for each machine
                    allMachines = allMachines.map((m: any) => {
                        const owner = m.organization_id ? ownerMap.get(m.organization_id) : null;

                        // Case 1: machine owned by a customer → bucket is owner itself
                        if (owner?.type === "customer") {
                            return {
                                ...m,
                                _ownerOrgType: "customer",
                                _customerId: owner.id,
                                _customerName: owner.name,
                            };
                        }

                        // Case 2: machine owned by manufacturer → bucket from assignment
                        const cid = asgMap.get(m.id) ?? null;
                        if (cid) {
                            return {
                                ...m,
                                _ownerOrgType: "manufacturer",
                                _customerId: cid,
                                _customerName: customerNameMap.get(cid) ?? "Cliente",
                            };
                        }

                        // Case 3: manufacturer-owned and not assigned
                        return {
                            ...m,
                            _ownerOrgType: owner?.type ?? "manufacturer",
                            _customerId: null,
                            _customerName: null,
                        };
                    });

                    // Manufacturer view: default grouped by customer
                    setGroupedView(true);

                    // expand all customers by default
                    const custIds = [
                        ...new Set(allMachines.map((m: any) => m._customerId).filter(Boolean)),
                    ] as string[];
                    setExpandedCustomers(new Set(custIds));

                    // plants irrelevant for manufacturer grouping UI
                    setPlants([]);
                    setExpandedPlants(new Set());
                }

                setMachines(allMachines);
                setFilteredMachines(allMachines);

                const cats = [...new Set(allMachines.map((m: any) => m.category).filter(Boolean))] as string[];
                setCategories(cats);
            } catch (error: any) {
                console.error("Error loading:", error);
                toast({
                    title: "Errore",
                    description: error?.message ?? "Errore caricamento",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // =========================
    // FILTERS
    // =========================
    useEffect(() => {
        let filtered = machines;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (m) =>
                    m.name?.toLowerCase().includes(q) ||
                    m.internal_code?.toLowerCase().includes(q) ||
                    m.serial_number?.toLowerCase().includes(q) ||
                    m.position?.toLowerCase().includes(q) ||
                    m.brand?.toLowerCase().includes(q) ||
                    m._customerName?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== "all") filtered = filtered.filter((m) => m.lifecycle_state === statusFilter);
        if (categoryFilter !== "all") filtered = filtered.filter((m) => m.category === categoryFilter);

        // Customer-only source filter
        if (orgType === "customer") {
            if (sourceFilter === "own") filtered = filtered.filter((m) => !m._isAssigned);
            if (sourceFilter === "assigned") filtered = filtered.filter((m) => !!m._isAssigned);
        }

        setFilteredMachines(filtered);
    }, [searchQuery, statusFilter, categoryFilter, sourceFilter, machines, orgType]);

    // =========================
    // DELETE
    // =========================
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
            toast({ title: "Errore", description: error?.message || "Errore", variant: "destructive" });
        } finally {
            setDeleting(null);
        }
    };

    const getStatusConfig = (state: string | null) => {
        const configs: Record<string, { label: string; color: string }> = {
            active: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-300 dark:border-green-500/30",
            },
            commissioned: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-300 dark:border-green-500/30",
            },
            inactive: {
                label: "Inattivo",
                color:
                    "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
            },
            under_maintenance: {
                label: "In Manutenzione",
                color:
                    "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-300 dark:border-amber-500/30",
            },
            decommissioned: {
                label: "Dismesso",
                color:
                    "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
            },
        };

        return (
            configs[state || "active"] || {
                label: state || "—",
                color:
                    "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
            }
        );
    };

    const perms = ctx ? getPermissions({ role: ctx.role, orgType: orgType as any }) : null;
    const isAdmin = perms?.isAdminOrSupervisor ?? false;
    const isCustomer = orgType === "customer";
    const isManufacturer = orgType === "manufacturer";
    const hasAssigned = machines.some((m) => !!m._isAssigned);

    // =========================
    // TOGGLES (GROUP SECTIONS)
    // =========================
    const togglePlant = (id: string) => {
        setExpandedPlants((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleCustomer = (id: string) => {
        setExpandedCustomers((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    // =========================
    // CARD
    // =========================
    const MachineCard = ({ item }: { item: Machine }) => {
        const status = getStatusConfig(item.lifecycle_state);
        const canEdit = isCustomer ? !item._isAssigned : true; // manufacturer can edit its own domain (RLS handles anyway)

        return (
            <Card
                className={`rounded-2xl border-0 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden ${isCustomer && item._isAssigned ? "ring-1 ring-purple-200 dark:ring-purple-500/20" : ""
                    }`}
                onClick={() => router.push(`/equipment/${item.id}`)}
            >
                <CardContent className="p-5">
                    <div className="flex items-start gap-4 mb-3">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCustomer && item._isAssigned ? "bg-purple-50 dark:bg-purple-500/10" : "bg-blue-50 dark:bg-blue-500/10"
                                }`}
                        >
                            {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Wrench
                                    className={`w-6 h-6 ${isCustomer && item._isAssigned ? "text-purple-500 dark:text-purple-400" : "text-blue-500 dark:text-blue-400"
                                        }`}
                                />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-foreground text-sm truncate">{item.name}</h3>
                                    <p className="text-xs text-muted-foreground font-mono">{item.internal_code}</p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {item.qr_code_token && (
                                        <div className="p-1 rounded-md bg-muted/60">
                                            <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                    )}

                                    {isAdmin && canEdit && (
                                        <button
                                            onClick={(e) => handleDelete(e, item.id, item.name)}
                                            disabled={deleting === item.id}
                                            className="p-1 rounded-md bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${status.color}`}>{status.label}</Badge>

                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground border-border">
                            {item.category || "Generico"}
                        </Badge>

                        {/* CUSTOMER: show manufacturer badge for assigned */}
                        {isCustomer && item._isAssigned && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
                                <Factory className="w-3 h-3 mr-1" />
                                {item._manufacturerName || "Costruttore"}
                            </Badge>
                        )}

                        {/* MANUFACTURER: show customer badge (very useful in grid view) */}
                        {isManufacturer && item._customerName && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30">
                                <Users className="w-3 h-3 mr-1" />
                                {item._customerName}
                            </Badge>
                        )}
                    </div>

                    {item.position && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span className="truncate">{item.position}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // =========================
    // GROUPED VIEW RENDER
    // =========================
    const renderCustomerGroupedView = () => {
        // CUSTOMER: plant grouping (your current logic)
        const unassigned = filteredMachines.filter((m) => !m.plant_id && !m._isAssigned);
        const assignedMachines = filteredMachines.filter((m) => !!m._isAssigned);
        const plantMachinesList = filteredMachines.filter((m) => !!m.plant_id && !m._isAssigned);

        return (
            <div className="space-y-4">
                {assignedMachines.length > 0 && (
                    <div className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Factory className="w-5 h-5 text-purple-400" />
                            <span className="text-foreground font-bold text-lg">Macchine dal Costruttore</span>
                            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-300 dark:border-purple-500/30 ml-2">
                                {assignedMachines.length}
                            </Badge>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {assignedMachines.map((m) => (
                                    <MachineCard key={m.id} item={m} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {plants.map((plant) => {
                    const plantMachines = plantMachinesList.filter((m) => m.plant_id === plant.id);
                    const isExpanded = expandedPlants.has(plant.id);
                    if (plantMachines.length === 0 && searchQuery) return null;

                    return (
                        <div key={plant.id} className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                            <button
                                onClick={() => togglePlant(plant.id)}
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-blue-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-blue-400" />
                                )}
                                <Building2 className="w-5 h-5 text-blue-400" />
                                <span className="text-foreground font-bold text-lg">{plant.name}</span>
                                <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-300 dark:border-blue-500/30 ml-2">
                                    {plantMachines.length}
                                </Badge>
                            </button>

                            {isExpanded && plantMachines.length > 0 && (
                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {plantMachines.map((m) => (
                                            <MachineCard key={m.id} item={m} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {unassigned.length > 0 && (
                    <div className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Wrench className="w-5 h-5 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold text-lg">Non assegnate a stabilimento</span>
                            <Badge className="bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30 ml-2">
                                {unassigned.length}
                            </Badge>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unassigned.map((m) => (
                                    <MachineCard key={m.id} item={m} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderManufacturerGroupedView = () => {
        // MANUFACTURER: group by customer
        const UNASSIGNED_KEY = "__unassigned__";

        const grouped = new Map < string, { key: string; name: string; items: Machine[]
    }> ();

    for (const m of filteredMachines) {
        const key = m._customerId ? m._customerId : UNASSIGNED_KEY;
        const name = m._customerId ? (m._customerName || "Cliente") : "Non assegnate a cliente";

        if (!grouped.has(key)) grouped.set(key, { key, name, items: [] });
        grouped.get(key)!.items.push(m);
    }

    let groups = Array.from(grouped.values());
    groups.sort((a, b) => {
        if (a.key === UNASSIGNED_KEY) return 1;
        if (b.key === UNASSIGNED_KEY) return -1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="space-y-4">
            {groups.map((g) => {
                const isUnassigned = g.key === UNASSIGNED_KEY;
                const isExpanded = isUnassigned ? true : expandedCustomers.has(g.key);

                return (
                    <div key={g.key} className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                        <button
                            onClick={() => {
                                if (isUnassigned) return;
                                toggleCustomer(g.key);
                            }}
                            className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors ${isUnassigned ? "cursor-default" : ""
                                }`}
                        >
                            {isUnassigned ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-blue-400" />
                            )}

                            <Users className={`w-5 h-5 ${isUnassigned ? "text-muted-foreground" : "text-blue-400"}`} />
                            <span className={`font-bold text-lg ${isUnassigned ? "text-muted-foreground" : "text-foreground"}`}>
                                {g.name}
                            </span>
                            <Badge
                                className={`ml-2 ${isUnassigned
                                        ? "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"
                                        : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-300 dark:border-blue-500/30"
                                    }`}
                            >
                                {g.items.length}
                            </Badge>
                        </button>

                        {isExpanded && g.items.length > 0 && (
                            <div className="px-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {g.items.map((m) => (
                                        <MachineCard key={m.id} item={m} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ✅ HARD GUARD RENDER: no flash wrong UI
if (loading || !orgType) return null;

return (
    <MainLayout userRole={ctx?.role as any}>
        <SEO title={`${t("equipment.title")} - MACHINA`} />

        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("equipment.title")}</h1>
                    <p className="text-muted-foreground mt-1">{t("equipment.subtitle")}</p>
                </div>

                <div className="flex gap-2">
                    {/* Toggle grouped view */}
                    {(isCustomer || isManufacturer) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGroupedView(!groupedView)}
                            className="border-border"
                        >
                            {groupedView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                            <span className="ml-2 hidden sm:inline">
                                {groupedView
                                    ? "Griglia"
                                    : isCustomer
                                        ? "Per stabilimento"
                                        : "Per cliente"}
                            </span>
                        </Button>
                    )}

                    {isAdmin && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push("/equipment/new")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("equipment.addEquipment")}
                        </Button>
                    )}
                </div>
            </div>

            <Card className="rounded-2xl border-0 bg-card shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t("common.search")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                            />
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px] bg-background border-border text-foreground rounded-xl">
                                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder={t("common.status")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("common.all")}</SelectItem>
                                    <SelectItem value="active">Attivo</SelectItem>
                                    <SelectItem value="under_maintenance">In Manutenzione</SelectItem>
                                    <SelectItem value="inactive">Inattivo</SelectItem>
                                    <SelectItem value="decommissioned">Dismesso</SelectItem>
                                </SelectContent>
                            </Select>

                            {categories.length > 0 && (
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[150px] bg-background border-border text-foreground rounded-xl">
                                        <SelectValue placeholder="Categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("common.all")}</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* customer-only provenance filter */}
                            {isCustomer && hasAssigned && (
                                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                    <SelectTrigger className="w-[150px] bg-background border-border text-foreground rounded-xl">
                                        <SelectValue placeholder="Provenienza" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tutte</SelectItem>
                                        <SelectItem value="own">Proprie</SelectItem>
                                        <SelectItem value="assigned">Dal Costruttore</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* VIEW */}
            {groupedView ? (
                isCustomer ? (
                    renderCustomerGroupedView()
                ) : (
                    renderManufacturerGroupedView()
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMachines.map((m) => (
                        <MachineCard key={m.id} item={m} />
                    ))}
                </div>
            )}

            {/* EMPTY */}
            {filteredMachines.length === 0 && (
                <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                    <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">{t("equipment.noEquipment")}</h3>
                    <p className="text-muted-foreground mb-6">{t("equipment.noEquipmentDesc")}</p>
                    {isAdmin && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push("/equipment/new")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("equipment.addFirst")}
                        </Button>
                    )}
                </Card>
            )}
        </div>
    </MainLayout>
);
}