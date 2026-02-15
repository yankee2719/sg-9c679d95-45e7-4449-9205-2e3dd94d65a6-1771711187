import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
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
    Factory,
    LayoutGrid,
    List,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
    id: string;
    name: string;
    equipment_code: string;
    category: string;
    serial_number: string | null;
    model: string | null;
    manufacturer: string | null;
    location: string | null;
    status: string;
    qr_code: string | null;
    plant_id: string | null;
    department_id: string | null;
}

interface Plant {
    id: string;
    name: string;
}

interface Department {
    id: string;
    name: string;
    plant_id: string;
}

export default function EquipmentPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < "admin" | "supervisor" | "technician" > ("technician");
    const [equipment, setEquipment] = useState < Equipment[] > ([]);
    const [filteredEquipment, setFilteredEquipment] = useState < Equipment[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [categories, setCategories] = useState < string[] > ([]);
    const [deleting, setDeleting] = useState < string | null > (null);

    // Plants & departments
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [departments, setDepartments] = useState < Department[] > ([]);
    const [groupedView, setGroupedView] = useState(false);
    const [expandedPlants, setExpandedPlants] = useState < Set < string >> (new Set());
    const [expandedDepts, setExpandedDepts] = useState < Set < string >> (new Set());

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    setUserRole(profile.role as "admin" | "supervisor" | "technician");
                }

                const { data: equipmentData } = await supabase
                    .from("equipment")
                    .select("*")
                    .order("name");

                if (equipmentData) {
                    setEquipment(equipmentData);
                    setFilteredEquipment(equipmentData);
                    const uniqueCategories = [...new Set(equipmentData.map(e => e.category).filter(Boolean))];
                    setCategories(uniqueCategories);

                    // Check if any equipment has plant_id — auto-enable grouped view
                    const hasPlants = equipmentData.some(e => e.plant_id);
                    if (hasPlants) setGroupedView(true);
                }

                // Load plants & departments
                const { data: plantsData } = await supabase
                    .from("plants")
                    .select("id, name")
                    .eq("is_active", true)
                    .order("name");
                if (plantsData) {
                    setPlants(plantsData);
                    // Expand all by default
                    setExpandedPlants(new Set(plantsData.map(p => p.id)));
                }

                const { data: deptsData } = await supabase
                    .from("departments")
                    .select("id, name, plant_id")
                    .eq("is_active", true)
                    .order("name");
                if (deptsData) {
                    setDepartments(deptsData);
                    setExpandedDepts(new Set(deptsData.map(d => d.id)));
                }
            } catch (error) {
                console.error("Error loading equipment:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [router]);

    useEffect(() => {
        let filtered = equipment;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.equipment_code?.toLowerCase().includes(query) ||
                    item.serial_number?.toLowerCase().includes(query) ||
                    item.location?.toLowerCase().includes(query) ||
                    item.manufacturer?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((item) => item.status === statusFilter);
        }

        if (categoryFilter !== "all") {
            filtered = filtered.filter((item) => item.category === categoryFilter);
        }

        setFilteredEquipment(filtered);
    }, [searchQuery, statusFilter, categoryFilter, equipment]);

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`Sei sicuro di voler eliminare "${name}"?\n\nVerranno eliminati anche tutti i documenti, manutenzioni e checklist associati.`)) return;

        setDeleting(id);
        try {
            const { error } = await supabase.from("equipment").delete().eq("id", id);
            if (error) throw error;
            setEquipment((prev) => prev.filter((item) => item.id !== id));
            toast({ title: "Eliminato", description: `"${name}" è stato eliminato correttamente` });
        } catch (error) {
            console.error("Delete error:", error);
            toast({
                title: "Errore",
                description: error instanceof Error ? error.message : "Errore durante l'eliminazione",
                variant: "destructive",
            });
        } finally {
            setDeleting(null);
        }
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            active: { label: t("equipment.active"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
            under_maintenance: { label: t("equipment.maintenance"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
            inactive: { label: t("equipment.inactive"), color: "bg-slate-500/20 text-muted-foreground border-slate-500/30" },
            retired: { label: t("equipment.decommissioned"), color: "bg-red-500/20 text-red-400 border-red-500/30" },
        };
        return configs[status] || configs.active;
    };

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const togglePlant = (plantId: string) => {
        setExpandedPlants(prev => {
            const next = new Set(prev);
            if (next.has(plantId)) next.delete(plantId); else next.add(plantId);
            return next;
        });
    };

    const toggleDept = (deptId: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(deptId)) next.delete(deptId); else next.add(deptId);
            return next;
        });
    };

    // Equipment card component
    const EquipmentCard = ({ item }: { item: Equipment }) => {
        const status = getStatusConfig(item.status);
        return (
            <Card
                className="rounded-2xl border-border bg-card/80 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/equipment/${item.id}`)}
            >
                <div className="h-32 bg-muted/50 relative overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                        <Wrench className="w-10 h-10 text-muted-foreground/60" />
                    </div>
                    {item.qr_code && (
                        <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-lg">
                            <QrCode className="w-4 h-4 text-slate-800" />
                        </div>
                    )}
                    {isAdmin && (
                        <button
                            onClick={(e) => handleDelete(e, item.id, item.name)}
                            disabled={deleting === item.id}
                            className="absolute top-3 left-3 bg-red-500/80 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            title="Elimina attrezzatura"
                        >
                            <Trash2 className="w-4 h-4 text-foreground" />
                        </button>
                    )}
                </div>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-foreground text-sm truncate flex-1">{item.name}</h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors flex-shrink-0 ml-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 font-mono">{item.equipment_code}</p>
                    {item.location && (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{item.location}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.category || t("equipment.generic")}</span>
                        <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>
                            {status.label}
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Grouped view renderer
    const renderGroupedView = () => {
        const unassigned = filteredEquipment.filter(e => !e.plant_id);

        return (
            <div className="space-y-4">
                {plants.map((plant) => {
                    const plantEquipment = filteredEquipment.filter(e => e.plant_id === plant.id);
                    const plantDepts = departments.filter(d => d.plant_id === plant.id);
                    const directEquipment = plantEquipment.filter(e => !e.department_id);
                    const isExpanded = expandedPlants.has(plant.id);

                    if (plantEquipment.length === 0 && searchQuery) return null;

                    return (
                        <div key={plant.id} className="rounded-2xl border border-blue-500/30 bg-card/50 overflow-hidden">
                            {/* Plant header */}
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
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 ml-2">
                                    {plantEquipment.length} attrezzature
                                </Badge>
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-3">
                                    {/* Departments within plant */}
                                    {plantDepts.map((dept) => {
                                        const deptEquipment = plantEquipment.filter(e => e.department_id === dept.id);
                                        const isDeptExpanded = expandedDepts.has(dept.id);

                                        if (deptEquipment.length === 0 && searchQuery) return null;

                                        return (
                                            <div key={dept.id} className="rounded-xl border border-amber-500/20 bg-card/60 overflow-hidden ml-4">
                                                {/* Department header */}
                                                <button
                                                    onClick={() => toggleDept(dept.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                                                >
                                                    {isDeptExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-amber-400" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-amber-400" />
                                                    )}
                                                    <Factory className="w-4 h-4 text-amber-400" />
                                                    <span className="text-foreground font-semibold">{dept.name}</span>
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2 text-xs">
                                                        {deptEquipment.length}
                                                    </Badge>
                                                </button>

                                                {isDeptExpanded && deptEquipment.length > 0 && (
                                                    <div className="px-4 pb-4 pt-1">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {deptEquipment.map((item) => (
                                                                <EquipmentCard key={item.id} item={item} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {isDeptExpanded && deptEquipment.length === 0 && (
                                                    <p className="px-4 pb-3 text-sm text-muted-foreground ml-8">Nessuna attrezzatura in questo reparto</p>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Equipment directly assigned to plant (no department) */}
                                    {directEquipment.length > 0 && (
                                        <div className="ml-4">
                                            {plantDepts.length > 0 && (
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 ml-1">
                                                    Senza reparto
                                                </p>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {directEquipment.map((item) => (
                                                    <EquipmentCard key={item.id} item={item} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned equipment */}
                {unassigned.length > 0 && (
                    <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4">
                            <Wrench className="w-5 h-5 text-muted-foreground" />
                            <span className="text-muted-foreground font-bold text-lg">Non assegnate</span>
                            <Badge className="bg-slate-500/20 text-muted-foreground border-slate-500/30 ml-2">
                                {unassigned.length}
                            </Badge>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {unassigned.map((item) => (
                                    <EquipmentCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Flat grid view
    const renderFlatView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((item) => (
                <EquipmentCard key={item.id} item={item} />
            ))}
        </div>
    );

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <SEO title={`${t("equipment.title")} - MACHINA`} />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("equipment.title")}</h1>
                        <p className="text-muted-foreground mt-1">{t("equipment.subtitle")}</p>
                    </div>
                    <div className="flex gap-2">
                        {plants.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGroupedView(!groupedView)}
                                className="border-border"
                                title={groupedView ? "Vista griglia" : "Vista per stabilimento"}
                            >
                                {groupedView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                <span className="ml-2 hidden sm:inline">{groupedView ? "Griglia" : "Per stabilimento"}</span>
                            </Button>
                        )}
                        {isAdmin && (
                            <Button
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-foreground"
                                onClick={() => router.push("/equipment/new")}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t("equipment.addEquipment")}
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
                                <Input
                                    placeholder={t("common.search")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px] bg-muted/50 border-border text-foreground">
                                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder={t("common.status")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="all" className="text-foreground hover:bg-muted">{t("common.all")}</SelectItem>
                                        <SelectItem value="active" className="text-foreground hover:bg-muted">{t("equipment.active")}</SelectItem>
                                        <SelectItem value="under_maintenance" className="text-foreground hover:bg-muted">{t("equipment.maintenance")}</SelectItem>
                                        <SelectItem value="inactive" className="text-foreground hover:bg-muted">{t("equipment.inactive")}</SelectItem>
                                        <SelectItem value="retired" className="text-foreground hover:bg-muted">{t("equipment.decommissioned")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-[160px] bg-muted/50 border-border text-foreground">
                                        <SelectValue placeholder={t("equipment.category")} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="all" className="text-foreground hover:bg-muted">{t("common.all")}</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat} className="text-foreground hover:bg-muted">
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Equipment view */}
                {groupedView ? renderGroupedView() : renderFlatView()}

                {/* Empty State */}
                {filteredEquipment.length === 0 && (
                    <Card className="rounded-2xl border-border bg-card/80 backdrop-blur-sm p-12 text-center">
                        <Wrench className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t("equipment.noEquipment")}</h3>
                        <p className="text-muted-foreground mb-6">{t("equipment.noEquipmentDesc")}</p>
                        {isAdmin && (
                            <Button
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-foreground"
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