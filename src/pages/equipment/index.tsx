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
    _manufacturerName?: string | null; // customer-view only
}

interface Plant {
    id: string;
    name: string;
}

interface CustomerOrg {
    id: string;
    name: string;
}

async function getOrgTypeById(
    orgId: string
): Promise<"manufacturer" | "customer" | null> {
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

    // DB-truth
    const [orgType, setOrgType] = useState < "manufacturer" | "customer" | null > (
        null
    );
    const [effectiveOrgId, setEffectiveOrgId] = useState < string | null > (null);

    const [machines, setMachines] = useState < Machine[] > ([]);
    const [filteredMachines, setFilteredMachines] = useState < Machine[] > ([]);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all"); // customer-only (all|own|assigned)
    const [categories, setCategories] = useState < string[] > ([]);

    // delete (manufacturer only)
    const [deleting, setDeleting] = useState < string | null > (null);

    // customer-only grouping
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [groupedView, setGroupedView] = useState(false);
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
                    setHiddenMachineIds(new Set((hidden ?? []).map((r: any) => r.machine_id)));
                } else {
                    setHiddenMachineIds(new Set());
                }

                // 1) carico macchine visibili (RLS decide cosa vedi)
                const { data: machineData, error: machineErr } = await supabase
                    .from("machines")
                    .select("*")
                    .order("name");

                if (machineErr) throw machineErr;
                let allMachines: Machine[] = (machineData ?? []) as any;

                // ===== CUSTOMER VIEW =====
                if (type === "customer") {
                    // tag assigned-from-manufacturer using assignments
                    const { data: assignments, error: asgErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, manufacturer_org_id")
                        .eq("customer_org_id", orgId)
                        .eq("is_active", true);

                    if (asgErr) throw asgErr;

                    const assignedIds = new Set((assignments ?? []).map((a: any) => a.machine_id));

                    allMachines = allMachines.map((m) => ({
                        ...m,
                        _isAssignedToCustomer: assignedIds.has(m.id) && m.organization_id !== orgId,
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

                    setPlants((plantsData ?? []) as any);
                    setExpandedPlants(new Set((plantsData ?? []).map((p: any) => p.id)));

                    if (allMachines.some((m) => m.plant_id)) setGroupedView(true);
                }

                // ===== MANUFACTURER VIEW =====
                if (type === "manufacturer") {
                    // load customers list (for sections)
                    const { data: custData, error: custErr } = await supabase
                        .from("organizations")
                        .select("id,name")
                        .eq("manufacturer_org_id", orgId)
                        .eq("type", "customer")
                        .order("name", { ascending: true });

                    if (custErr) throw custErr;
                    setCustomers((custData ?? []) as any);
                    setExpandedCustomers(new Set((custData ?? []).map((c: any) => c.id)));

                    // load assignments active for this manufacturer
                    const { data: asgData, error: asgErr } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, customer_org_id")
                        .eq("manufacturer_org_id", orgId)
                        .eq("is_active", true);

                    if (asgErr) throw asgErr;

                    const machineToCustomer = new Map < string, string> ();
                    const customerIds = new Set < string > ();

                    (asgData ?? []).forEach((a: any) => {
                        if (a?.machine_id && a?.customer_org_id) {
                            machineToCustomer.set(a.machine_id, a.customer_org_id);
                            customerIds.add(a.customer_org_id);
                        }
                    });

                    // load customer names (fallback)
                    let customerMap = new Map < string, string> ();
                    const uniqueCustomerIds = [...customerIds];
                    if (uniqueCustomerIds.length > 0) {
                        const { data: orgs, error: orgErr } = await supabase
                            .from("organizations")
                            .select("id,name")
                            .in("id", uniqueCustomerIds);

                        if (orgErr) throw orgErr;
                        customerMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
                    }

                    allMachines = allMachines.map((m) => {
                        const custId = machineToCustomer.get(m.id) ?? null;
                        return {
                            ...m,
                            _customerOrgId: custId,
                            _customerName: custId ? customerMap.get(custId) ?? null : null,
                            _isAssignedToCustomer: !!custId,
                        };
                    });
                }

                setMachines(allMachines);
                setFilteredMachines(allMachines);

                const cats = [...new Set(allMachines.map((m) => m.category).filter(Boolean))] as string[];
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
    }, [router, toast]);

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

        if (statusFilter !== "all") filtered = filtered.filter((m) => m.lifecycle_state === statusFilter);
        if (categoryFilter !== "all") filtered = filtered.filter((m) => m.category === categoryFilter);

        // customer-only filter: provenance
        if (orgType === "customer") {
            if (sourceFilter === "own") filtered = filtered.filter((m) => !m._isAssignedToCustomer);
            if (sourceFilter === "assigned") filtered = filtered.filter((m) => !!m._isAssignedToCustomer);

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

    const perms = useMemo(() => {
        if (!ctx) return null;
        return getPermissions({ role: ctx.role, orgType: orgType as any });
    }, [ctx, orgType]);

    const isAdmin = perms?.isAdminOrSupervisor ?? false;
    const isCustomer = orgType === "customer";
    const isManufacturer = orgType === "manufacturer";
    const canUsePlantsGrouping = isCustomer ? (perms?.canManagePlants ?? false) : true;

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
            toast({ title: "Errore", description: error?.message || "Errore", variant: "destructive" });
        } finally {
            setDeleting(null);
        }
    };

    const toggleHideLocal = async (e: React.MouseEvent, machineId: string) => {
        e.stopPropagation();
        if (!isCustomer || !effectiveOrgId) return;
        if (!isAdmin) {
            toast({ title: "Permesso negato", description: "Solo Admin/Supervisor possono archiviare.", variant: "destructive" });
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

                toast({ title: "Ripristinata", description: "Macchina ripristinata nella lista." });
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

                toast({ title: "Archiviata", description: "Macchina archiviata localmente (solo per questo cliente)." });
            }
        } catch (err: any) {
            console.error(err);
            toast({ title: "Errore", description: err?.message ?? "Errore", variant: "destructive" });
        } finally {
            setTogglingHide(null);
        }
    };

    const getStatusConfig = (state: string | null) => {
        const configs: Record<string, { label: string; color: string }> = {
            active: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
            },
            commissioned: {
                label: "Attivo",
                color:
                    "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
            },
            inactive: {
                label: "Inattivo",
                color:
                    "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
            },
            under_maintenance: {
                label: "In Manutenzione",
                color:
                    "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
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

    // ---------------------------
    // CARD
    // ---------------------------
    const MachineCard = ({ item }: { item: Machine }) => {
        const status = getStatusConfig(item.lifecycle_state);

        // DELETE RULE:
        // - Manufacturer: can delete only machines it owns
        // - Customer: cannot delete (ever) -> local archive only
        const canDelete =
            isManufacturer &&
            isAdmin &&
            !!effectiveOrgId &&
            item.organization_id === effectiveOrgId;

        const isHiddenLocal = isCustomer && hiddenMachineIds.has(item.id);
        const canLocalArchive = isCustomer && isAdmin && !!effectiveOrgId;

        return (
            <Card
                className={`rounded-2xl border-0 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden ${item._isAssignedToCustomer ? "ring-1 ring-purple-200 dark:ring-purple-500/20" : ""
                    }`}
                onClick={() => router.push(`/equipment/${item.id}`)}
            >
                <CardContent className="p-5">
                    <div className="flex items-start gap-4 mb-3">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item._isAssignedToCustomer ? "bg-purple-50 dark:bg-purple-500/10" : "bg-blue-50 dark:bg-blue-500/10"
                                }`}
                        >
                            {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Wrench
                                    className={`w-6 h-6 ${item._isAssignedToCustomer
                                            ? "text-purple-500 dark:text-purple-400"
                                            : "text-blue-500 dark:text-blue-400"
                                        }`}
                                />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-foreground text-sm truncate">{item.name}</h3>
                                    <p className="text-xs text-muted-foreground font-mono">{item.internal_code ?? "—"}</p>
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
                                            className="p-1 rounded-md bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                            title="Elimina definitivamente"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${status.color}`}>
                            {status.label}
                        </Badge>

                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground border-border">
                            {item.category || "Generico"}
                        </Badge>

                        {isCustomer && item._isAssignedToCustomer && (
                            <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
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
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span className="truncate">{item.position}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // ---------------------------
    // RENDER: CUSTOMER by PLANT
    // ---------------------------
    const renderCustomerGroupedByPlant = () => {
        const assignedMachines = filteredMachines.filter((m) => !!m._isAssignedToCustomer);
        const plantMachinesList = filteredMachines.filter((m) => m.plant_id && !m._isAssignedToCustomer);
        const unassigned = filteredMachines.filter((m) => !m.plant_id && !m._isAssignedToCustomer);

        return (
            <div className="space-y-4">
                {assignedMachines.length > 0 && (
                    <div className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Factory className="w-5 h-5 text-purple-400" />
                            <span className="text-foreground font-bold text-lg">Macchine dal Costruttore</span>
                            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 ml-2">
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
                                <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30 ml-2">
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

    // ---------------------------
    // RENDER: MANUFACTURER by CUSTOMER
    // ---------------------------
    const renderManufacturerGroupedByCustomer = () => {
        const assigned = filteredMachines.filter((m) => !!m._customerOrgId);
        const unassigned = filteredMachines.filter((m) => !m._customerOrgId);

        const byCustomer = new Map < string, Machine[]> ();
        assigned.forEach((m) => {
            const key = m._customerOrgId as string;
            if (!byCustomer.has(key)) byCustomer.set(key, []);
            byCustomer.get(key)!.push(m);
        });

        const orderedCustomerIds = [
            ...customers.map((c) => c.id),
            ...[...byCustomer.keys()].filter((id) => !customers.some((c) => c.id === id)),
        ];

        return (
            <div className="space-y-4">
                {orderedCustomerIds.map((cid) => {
                    const list = byCustomer.get(cid) ?? [];
                    if (list.length === 0 && searchQuery) return null;

                    const cName =
                        customers.find((c) => c.id === cid)?.name ||
                        list[0]?._customerName ||
                        "Cliente";

                    const expanded = expandedCustomers.has(cid);
                    if (list.length === 0) return null;

                    return (
                        <div key={cid} className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                            <button
                                onClick={() => toggleCustomer(cid)}
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
                            >
                                {expanded ? (
                                    <ChevronDown className="w-5 h-5 text-purple-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-purple-400" />
                                )}
                                <Users className="w-5 h-5 text-purple-400" />
                                <span className="text-foreground font-bold text-lg">{cName}</span>
                                <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 ml-2">
                                    {list.length}
                                </Badge>
                            </button>

                            {expanded && (
                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {list.map((m) => (
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
                            <Package className="w-5 h-5 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold text-lg">Non assegnate a cliente</span>
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

    if (loading) return null;

    const hasAssignedForCustomer =
        orgType === "customer" && machines.some((m) => !!m._isAssignedToCustomer);

    return (
        <MainLayout userRole={ctx?.role as any}>
            <SEO title={`${t("equipment.title")} - MACHINA`} />

            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("equipment.title")}</h1>
                        <p className="text-muted-foreground mt-1">{t("equipment.subtitle")}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {/* customer: toggle view */}
                        {orgType === "customer" && plants.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGroupedView(!groupedView)}
                                className="border-border"
                            >
                                {groupedView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                <span className="ml-2 hidden sm:inline">{groupedView ? "Griglia" : "Per stabilimento"}</span>
                            </Button>
                        )}

                        {/* customer: show hidden local */}
                        {orgType === "customer" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowHiddenLocal((v) => !v)}
                                className="border-border"
                                title="Mostra/Nascondi archiviate localmente"
                            >
                                {showHiddenLocal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                <span className="ml-2 hidden sm:inline">
                                    {showHiddenLocal ? "Mostra tutte" : "Nascondi archiviate"}
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

                                {orgType === "customer" && hasAssignedForCustomer && (
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

                {/* RENDER */}
                {isManufacturer ? (
                    renderManufacturerGroupedByCustomer()
                ) : groupedView ? (
                    renderCustomerGroupedByPlant()
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMachines.map((m) => (
                            <MachineCard key={m.id} item={m} />
                        ))}
                    </div>
                )}

                {filteredMachines.length === 0 && (
                    <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                        <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t("equipment.noEquipment")}</h3>
                        <p className="text-muted-foreground mb-6">{t("equipment.noEquipmentDesc")}</p>
                        {isAdmin && (
                            <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/equipment/new")}>
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