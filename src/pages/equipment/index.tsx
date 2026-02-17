import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Plus, Search, Wrench, MapPin, Filter, ChevronRight, ChevronDown,
    QrCode, Trash2, Building2, LayoutGrid, List, Factory,
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
    // UI-only flags
    _isAssigned?: boolean;      // true if this comes from machine_assignments
    _manufacturerName?: string; // manufacturer org name
}

interface Plant { id: string; name: string; }

export default function EquipmentPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState < UserContext | null > (null);
    const [machines, setMachines] = useState < Machine[] > ([]);
    const [filteredMachines, setFilteredMachines] = useState < Machine[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all"); // all | own | assigned
    const [categories, setCategories] = useState < string[] > ([]);
    const [deleting, setDeleting] = useState < string | null > (null);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [groupedView, setGroupedView] = useState(false);
    const [expandedPlants, setExpandedPlants] = useState < Set < string >> (new Set());

    useEffect(() => {
        const loadData = async () => {
            try {
                const userCtx = await getUserContext();
                if (!userCtx) { router.push("/login"); return; }
                setCtx(userCtx);

                // 1. Load own machines (RLS handles org filter)
                const { data: machineData } = await supabase
                    .from("machines").select("*").order("name");

                let allMachines: Machine[] = (machineData || []).map(m => ({
                    ...m,
                    _isAssigned: m.organization_id !== userCtx.orgId,
                }));

                // 2. For customer orgs: also load assigned machines and tag them
                if (userCtx.orgType === "customer" && userCtx.orgId) {
                    const { data: assignments } = await supabase
                        .from("machine_assignments")
                        .select("machine_id, machines(organization_id)")
                        .eq("customer_org_id", userCtx.orgId)
                        .eq("is_active", true);

                    if (assignments) {
                        const assignedIds = new Set(assignments.map((a: any) => a.machine_id));
                        allMachines = allMachines.map(m => ({
                            ...m,
                            _isAssigned: assignedIds.has(m.id) && m.organization_id !== userCtx.orgId,
                        }));
                    }

                    // Get manufacturer name for assigned machines
                    if (allMachines.some(m => m._isAssigned)) {
                        const mfrOrgIds = [...new Set(allMachines.filter(m => m._isAssigned).map(m => m.organization_id).filter(Boolean))];
                        if (mfrOrgIds.length > 0) {
                            const { data: mfrOrgs } = await supabase
                                .from("organizations").select("id, name").in("id", mfrOrgIds);
                            if (mfrOrgs) {
                                const mfrMap = new Map(mfrOrgs.map(o => [o.id, o.name]));
                                allMachines = allMachines.map(m => ({
                                    ...m,
                                    _manufacturerName: m._isAssigned && m.organization_id ? mfrMap.get(m.organization_id) || null : null,
                                })) as Machine[];
                            }
                        }
                    }
                }

                setMachines(allMachines);
                setFilteredMachines(allMachines);
                const cats = [...new Set(allMachines.map(m => m.category).filter(Boolean))] as string[];
                setCategories(cats);
                if (allMachines.some(m => m.plant_id)) setGroupedView(true);

                const { data: plantsData } = await supabase
                    .from("plants").select("id, name").eq("is_archived", false).order("name");
                if (plantsData) {
                    setPlants(plantsData);
                    setExpandedPlants(new Set(plantsData.map(p => p.id)));
                }
            } catch (error) {
                console.error("Error loading:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [router]);

    useEffect(() => {
        let filtered = machines;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.internal_code?.toLowerCase().includes(q) ||
                m.serial_number?.toLowerCase().includes(q) ||
                m.position?.toLowerCase().includes(q) ||
                m.brand?.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") filtered = filtered.filter(m => m.lifecycle_state === statusFilter);
        if (categoryFilter !== "all") filtered = filtered.filter(m => m.category === categoryFilter);
        if (sourceFilter === "own") filtered = filtered.filter(m => !m._isAssigned);
        if (sourceFilter === "assigned") filtered = filtered.filter(m => m._isAssigned);
        setFilteredMachines(filtered);
    }, [searchQuery, statusFilter, categoryFilter, sourceFilter, machines]);

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`Sei sicuro di voler eliminare "${name}"?`)) return;
        setDeleting(id);
        try {
            const { error } = await supabase.from("machines").delete().eq("id", id);
            if (error) throw error;
            setMachines(prev => prev.filter(m => m.id !== id));
            toast({ title: "Eliminato", description: `"${name}" eliminato` });
        } catch (error: any) {
            toast({ title: "Errore", description: error?.message || "Errore", variant: "destructive" });
        } finally {
            setDeleting(null);
        }
    };

    const getStatusConfig = (state: string | null) => {
        const configs: Record<string, { label: string; color: string }> = {
            active: { label: "Attivo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
            commissioned: { label: "Attivo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
            inactive: { label: "Inattivo", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
            under_maintenance: { label: "In Manutenzione", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
            decommissioned: { label: "Dismesso", color: "bg-red-500/20 text-red-400 border-red-500/30" },
        };
        return configs[state || "active"] || { label: state || "—", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
    };

    const isAdmin = ctx?.role === "admin" || ctx?.role === "supervisor";
    const isCustomer = ctx?.orgType === "customer";
    const hasAssigned = machines.some(m => m._isAssigned);

    const togglePlant = (id: string) => {
        setExpandedPlants(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const MachineCard = ({ item }: { item: Machine }) => {
        const status = getStatusConfig(item.lifecycle_state);
        const canEdit = !item._isAssigned; // Can't edit manufacturer's machines
        return (
            <Card
                className={`rounded-2xl border-border bg-card/80 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden ${item._isAssigned ? "border-purple-500/20" : ""}`}
                onClick={() => router.push(`/equipment/${item.id}`)}
            >
                <div className="h-32 bg-muted/50 relative overflow-hidden">
                    {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Wrench className={`w-10 h-10 ${item._isAssigned ? "text-purple-400/60" : "text-muted-foreground/60"}`} />
                        </div>
                    )}
                    {item._isAssigned && (
                        <div className="absolute top-3 left-3 bg-purple-500/90 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Factory className="w-3 h-3 text-white" />
                            <span className="text-white text-xs font-medium">{item._manufacturerName || "Costruttore"}</span>
                        </div>
                    )}
                    {item.qr_code_token && (
                        <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-lg">
                            <QrCode className="w-4 h-4 text-slate-800" />
                        </div>
                    )}
                    {isAdmin && canEdit && (
                        <button
                            onClick={(e) => handleDelete(e, item.id, item.name)}
                            disabled={deleting === item.id}
                            className="absolute top-3 left-3 bg-red-500/80 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-foreground text-sm truncate flex-1">{item.name}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors flex-shrink-0 ml-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 font-mono">{item.internal_code}</p>
                    {item.position && (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{item.position}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.category || "Generico"}</span>
                        <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>{status.label}</Badge>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderGroupedView = () => {
        const unassigned = filteredMachines.filter(m => !m.plant_id && !m._isAssigned);
        const assignedMachines = filteredMachines.filter(m => m._isAssigned);
        const plantMachinesList = filteredMachines.filter(m => m.plant_id && !m._isAssigned);

        return (
            <div className="space-y-4">
                {/* Assigned from manufacturer */}
                {assignedMachines.length > 0 && (
                    <div className="rounded-2xl border border-purple-500/30 bg-card/50 overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Factory className="w-5 h-5 text-purple-400" />
                            <span className="text-foreground font-bold text-lg">Macchine dal Costruttore</span>
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 ml-2">{assignedMachines.length}</Badge>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {assignedMachines.map(m => <MachineCard key={m.id} item={m} />)}
                            </div>
                        </div>
                    </div>
                )}

                {/* By plant */}
                {plants.map(plant => {
                    const plantMachines = plantMachinesList.filter(m => m.plant_id === plant.id);
                    const isExpanded = expandedPlants.has(plant.id);
                    if (plantMachines.length === 0 && searchQuery) return null;
                    return (
                        <div key={plant.id} className="rounded-2xl border border-blue-500/30 bg-card/50 overflow-hidden">
                            <button onClick={() => togglePlant(plant.id)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-400" /> : <ChevronRight className="w-5 h-5 text-blue-400" />}
                                <Building2 className="w-5 h-5 text-blue-400" />
                                <span className="text-foreground font-bold text-lg">{plant.name}</span>
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-2">{plantMachines.length}</Badge>
                            </button>
                            {isExpanded && plantMachines.length > 0 && (
                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {plantMachines.map(m => <MachineCard key={m.id} item={m} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned to plant */}
                {unassigned.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Wrench className="w-5 h-5 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold text-lg">Non assegnate a stabilimento</span>
                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 ml-2">{unassigned.length}</Badge>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unassigned.map(m => <MachineCard key={m.id} item={m} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return null;

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
                        {plants.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => setGroupedView(!groupedView)} className="border-border">
                                {groupedView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                <span className="ml-2 hidden sm:inline">{groupedView ? "Griglia" : "Per stabilimento"}</span>
                            </Button>
                        )}
                        {isAdmin && (
                            <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/equipment/new")}>
                                <Plus className="w-4 h-4 mr-2" />{t("equipment.addEquipment")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input placeholder={t("common.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" />
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px] bg-muted/50 border-border text-foreground">
                                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder={t("common.status")} />
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
                                        <SelectTrigger className="w-[150px] bg-muted/50 border-border text-foreground">
                                            <SelectValue placeholder="Categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("common.all")}</SelectItem>
                                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                                {hasAssigned && (
                                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                        <SelectTrigger className="w-[150px] bg-muted/50 border-border text-foreground">
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

                {/* Machine list */}
                {groupedView ? renderGroupedView() : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMachines.map(m => <MachineCard key={m.id} item={m} />)}
                    </div>
                )}

                {filteredMachines.length === 0 && (
                    <Card className="rounded-2xl border-border bg-card/80 p-12 text-center">
                        <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t("equipment.noEquipment")}</h3>
                        <p className="text-muted-foreground mb-6">{t("equipment.noEquipmentDesc")}</p>
                        {isAdmin && (
                            <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/equipment/new")}>
                                <Plus className="w-4 h-4 mr-2" />{t("equipment.addFirst")}
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
