import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Building2,
    Factory,
    Layers,
    Trash2,
    Edit,
    ChevronRight,
    ChevronDown,
    MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plant {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    city: string | null;
    country: string;
    is_active: boolean;
    tenant_id: string;
}

interface Department {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    plant_id: string;
    tenant_id: string;
    is_active: boolean;
}

interface ProductionLine {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    department_id: string;
    tenant_id: string;
    is_active: boolean;
}

export default function PlantsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");
    const [tenantId, setTenantId] = useState < string | null > (null);

    const [plants, setPlants] = useState < Plant[] > ([]);
    const [departments, setDepartments] = useState < Department[] > ([]);
    const [lines, setLines] = useState < ProductionLine[] > ([]);

    const [expandedPlant, setExpandedPlant] = useState < string | null > (null);
    const [expandedDept, setExpandedDept] = useState < string | null > (null);

    // Dialog state
    const [showDialog, setShowDialog] = useState(false);
    const [dialogType, setDialogType] = useState < "plant" | "department" | "line" > ("plant");
    const [dialogMode, setDialogMode] = useState < "create" | "edit" > ("create");
    const [editId, setEditId] = useState < string | null > (null);
    const [parentId, setParentId] = useState < string | null > (null);
    const [formName, setFormName] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formAddress, setFormAddress] = useState("");
    const [formCity, setFormCity] = useState("");
    const [formDescription, setFormDescription] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, tenant_id")
                .eq("id", user.id)
                .single();

            if (!profile) return;
            setUserRole(profile.role);
            setTenantId(profile.tenant_id);

            if (profile.role === "technician") {
                router.push("/dashboard");
                return;
            }

            const { data: plantsData } = await supabase
                .from("plants")
                .select("*")
                .eq("tenant_id", profile.tenant_id)
                .order("name");

            const { data: deptsData } = await supabase
                .from("departments")
                .select("*")
                .eq("tenant_id", profile.tenant_id)
                .order("name");

            const { data: linesData } = await supabase
                .from("production_lines")
                .select("*")
                .eq("tenant_id", profile.tenant_id)
                .order("name");

            setPlants(plantsData || []);
            setDepartments(deptsData || []);
            setLines(linesData || []);
        } catch (error) {
            console.error("Error loading plants:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = (type: "plant" | "department" | "line", parent?: string) => {
        setDialogType(type);
        setDialogMode("create");
        setEditId(null);
        setParentId(parent || null);
        setFormName("");
        setFormCode("");
        setFormAddress("");
        setFormCity("");
        setFormDescription("");
        setShowDialog(true);
    };

    const openEdit = (type: "plant" | "department" | "line", item: any) => {
        setDialogType(type);
        setDialogMode("edit");
        setEditId(item.id);
        setFormName(item.name || "");
        setFormCode(item.code || "");
        setFormAddress(item.address || "");
        setFormCity(item.city || "");
        setFormDescription(item.description || "");
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formName.trim() || !tenantId) return;

        try {
            if (dialogType === "plant") {
                const payload = {
                    name: formName.trim(),
                    code: formCode.trim() || null,
                    address: formAddress.trim() || null,
                    city: formCity.trim() || null,
                    tenant_id: tenantId,
                    is_active: true,
                };

                if (dialogMode === "create") {
                    const { error } = await supabase.from("plants").insert(payload);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("plants").update(payload).eq("id", editId!);
                    if (error) throw error;
                }
            } else if (dialogType === "department") {
                const payload = {
                    name: formName.trim(),
                    code: formCode.trim() || null,
                    description: formDescription.trim() || null,
                    plant_id: parentId!,
                    tenant_id: tenantId,
                    is_active: true,
                };

                if (dialogMode === "create") {
                    const { error } = await supabase.from("departments").insert(payload);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("departments").update(payload).eq("id", editId!);
                    if (error) throw error;
                }
            } else if (dialogType === "line") {
                const payload = {
                    name: formName.trim(),
                    code: formCode.trim() || null,
                    description: formDescription.trim() || null,
                    department_id: parentId!,
                    tenant_id: tenantId,
                    is_active: true,
                };

                if (dialogMode === "create") {
                    const { error } = await supabase.from("production_lines").insert(payload);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("production_lines").update(payload).eq("id", editId!);
                    if (error) throw error;
                }
            }

            toast({ title: "Salvato", description: `${formName} salvato correttamente` });
            setShowDialog(false);
            loadData();
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async (type: "plant" | "department" | "line", id: string, name: string) => {
        const warnings: Record<string, string> = {
            plant: "Verranno eliminati anche tutti i reparti e le linee associate.",
            department: "Verranno eliminate anche tutte le linee associate.",
            line: "",
        };
        if (!confirm(`Eliminare "${name}"? ${warnings[type]}`)) return;

        try {
            const table = type === "plant" ? "plants" : type === "department" ? "departments" : "production_lines";
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error) throw error;
            toast({ title: "Eliminato", description: `"${name}" eliminato` });
            loadData();
        } catch (error: any) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
    };

    const dialogTitle = () => {
        const labels = { plant: "Stabilimento", department: "Reparto", line: "Linea di produzione" };
        return `${dialogMode === "create" ? "Nuovo" : "Modifica"} ${labels[dialogType]}`;
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Stabilimenti - MACHINA" />

            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stabilimenti</h1>
                        <p className="text-muted-foreground mt-1">Gestisci stabilimenti, reparti e linee di produzione</p>
                    </div>
                    <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-foreground" onClick={() => openCreate("plant")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo Stabilimento
                    </Button>
                </div>

                {plants.length === 0 ? (
                    <Card className="rounded-2xl border-border bg-card/80 p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessuno stabilimento</h3>
                        <p className="text-muted-foreground mb-6">Crea il primo stabilimento per organizzare il parco macchine</p>
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-foreground" onClick={() => openCreate("plant")}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crea Stabilimento
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {plants.map((plant) => {
                            const isExpanded = expandedPlant === plant.id;
                            const plantDepts = departments.filter((d) => d.plant_id === plant.id);

                            return (
                                <Card key={plant.id} className="rounded-2xl border-border bg-card/80 overflow-hidden">
                                    {/* Plant Header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => setExpandedPlant(isExpanded ? null : plant.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                                            <Building2 className="w-5 h-5 text-blue-400" />
                                            <div>
                                                <h3 className="font-bold text-foreground">{plant.name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    {plant.code && <span>{plant.code}</span>}
                                                    {plant.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {plant.city}
                                                        </span>
                                                    )}
                                                    <span>{plantDepts.length} reparti</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => openEdit("plant", plant)} className="p-2 rounded-lg hover:bg-slate-600 text-muted-foreground hover:text-foreground transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete("plant", plant.id, plant.name)} className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Departments */}
                                    {isExpanded && (
                                        <div className="border-t border-border bg-slate-900/30">
                                            <div className="p-3 pl-12">
                                                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-muted/50" onClick={() => openCreate("department", plant.id)}>
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Aggiungi Reparto
                                                </Button>
                                            </div>

                                            {plantDepts.map((dept) => {
                                                const isDeptExpanded = expandedDept === dept.id;
                                                const deptLines = lines.filter((l) => l.department_id === dept.id);

                                                return (
                                                    <div key={dept.id} className="border-t border-slate-800">
                                                        <div
                                                            className="flex items-center justify-between px-4 py-3 pl-12 cursor-pointer hover:bg-muted/20 transition-colors"
                                                            onClick={() => setExpandedDept(isDeptExpanded ? null : dept.id)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                                <Factory className="w-4 h-4 text-amber-400" />
                                                                <div>
                                                                    <span className="text-foreground font-medium">{dept.name}</span>
                                                                    {dept.code && <span className="text-muted-foreground text-sm ml-2">({dept.code})</span>}
                                                                    <span className="text-muted-foreground text-sm ml-3">{deptLines.length} linee</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <button onClick={() => openEdit("department", dept)} className="p-1.5 rounded hover:bg-slate-600 text-muted-foreground hover:text-foreground">
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDelete("department", dept.id, dept.name)} className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Production Lines */}
                                                        {isDeptExpanded && (
                                                            <div className="bg-slate-900/50">
                                                                <div className="p-2 pl-20">
                                                                    <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-muted/50 text-xs" onClick={() => openCreate("line", dept.id)}>
                                                                        <Plus className="w-3 h-3 mr-1" />
                                                                        Aggiungi Linea
                                                                    </Button>
                                                                </div>
                                                                {deptLines.map((line) => (
                                                                    <div key={line.id} className="flex items-center justify-between px-4 py-2 pl-20 border-t border-slate-800/50 hover:bg-muted/10">
                                                                        <div className="flex items-center gap-2">
                                                                            <Layers className="w-3.5 h-3.5 text-green-400" />
                                                                            <span className="text-muted-foreground text-sm">{line.name}</span>
                                                                            {line.code && <span className="text-muted-foreground/60 text-xs">({line.code})</span>}
                                                                        </div>
                                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                            <button onClick={() => openEdit("line", line)} className="p-1 rounded hover:bg-slate-600 text-muted-foreground hover:text-foreground">
                                                                                <Edit className="w-3 h-3" />
                                                                            </button>
                                                                            <button onClick={() => handleDelete("line", line.id, line.name)} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{dialogTitle()}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Nome *</label>
                            <Input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder={dialogType === "plant" ? "es. Stabilimento Nord" : dialogType === "department" ? "es. Reparto Assemblaggio" : "es. Linea 1"}
                                className="bg-slate-900 border-border text-foreground"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground">Codice</label>
                            <Input
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value)}
                                placeholder="es. STAB-01"
                                className="bg-slate-900 border-border text-foreground"
                            />
                        </div>

                        {dialogType === "plant" && (
                            <>
                                <div>
                                    <label className="text-sm text-muted-foreground">Indirizzo</label>
                                    <Input
                                        value={formAddress}
                                        onChange={(e) => setFormAddress(e.target.value)}
                                        placeholder="es. Via Roma 1"
                                        className="bg-slate-900 border-border text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Città</label>
                                    <Input
                                        value={formCity}
                                        onChange={(e) => setFormCity(e.target.value)}
                                        placeholder="es. Milano"
                                        className="bg-slate-900 border-border text-foreground"
                                    />
                                </div>
                            </>
                        )}

                        {(dialogType === "department" || dialogType === "line") && (
                            <div>
                                <label className="text-sm text-muted-foreground">Descrizione</label>
                                <Input
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Descrizione opzionale"
                                    className="bg-slate-900 border-border text-foreground"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)} className="border-border text-foreground hover:bg-muted">
                            Annulla
                        </Button>
                        <Button onClick={handleSave} disabled={!formName.trim()} className="bg-[#FF6B35] hover:bg-[#e55a2b]">
                            {dialogMode === "create" ? "Crea" : "Salva"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
