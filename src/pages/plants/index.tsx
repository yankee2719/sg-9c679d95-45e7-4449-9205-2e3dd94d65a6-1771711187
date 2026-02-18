import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Building2, Plus, Trash2, Edit2, Save, X, MapPin,
    ChevronDown, ChevronRight, Factory, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductionLine {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    plant_id: string;
    is_archived: boolean;
}

interface Plant {
    id: string;
    name: string;
    is_archived: boolean;
    address_line1: string | null;
    city: string | null;
    organization_id: string | null;
}

export default function PlantsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [lines, setLines] = useState < ProductionLine[] > ([]);
    const [expandedPlants, setExpandedPlants] = useState < Set < string >> (new Set());

    // Plant form
    const [showPlantForm, setShowPlantForm] = useState(false);
    const [editingPlantId, setEditingPlantId] = useState < string | null > (null);
    const [plantName, setPlantName] = useState("");
    const [plantAddress, setPlantAddress] = useState("");
    const [plantCity, setPlantCity] = useState("");
    const [savingPlant, setSavingPlant] = useState(false);

    // Line form
    const [showLineForm, setShowLineForm] = useState < string | null > (null); // plant_id or null
    const [editingLineId, setEditingLineId] = useState < string | null > (null);
    const [lineName, setLineName] = useState("");
    const [lineCode, setLineCode] = useState("");
    const [lineDesc, setLineDesc] = useState("");
    const [savingLine, setSavingLine] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);
                setOrgId(ctx.orgId);

                const { data: plantsData } = await supabase.from("plants").select("*").order("name");
                if (plantsData) {
                    setPlants(plantsData);
                    setExpandedPlants(new Set(plantsData.map((p: Plant) => p.id)));
                }

                const { data: linesData } = await supabase.from("production_lines").select("*").order("name");
                if (linesData) setLines(linesData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const togglePlant = (id: string) => {
        setExpandedPlants(prev => {
            const n = new Set(prev);
            if (n.has(id)) { n.delete(id); } else { n.add(id); }
            return n;
        });
    };

    // ========== PLANT CRUD ==========
    const resetPlantForm = () => {
        setPlantName(""); setPlantAddress(""); setPlantCity("");
        setEditingPlantId(null); setShowPlantForm(false);
    };

    const handleSavePlant = async () => {
        if (!plantName.trim()) return;
        setSavingPlant(true);
        try {
            if (editingPlantId) {
                const { error } = await supabase.from("plants")
                    .update({ name: plantName.trim(), address_line1: plantAddress.trim() || null, city: plantCity.trim() || null })
                    .eq("id", editingPlantId);
                if (error) throw error;
                setPlants(prev => prev.map(p => p.id === editingPlantId
                    ? { ...p, name: plantName.trim(), address_line1: plantAddress.trim() || null, city: plantCity.trim() || null }
                    : p));
                toast({ title: "Aggiornato" });
            } else {
                const { data, error } = await supabase.from("plants")
                    .insert({ name: plantName.trim(), address_line1: plantAddress.trim() || null, city: plantCity.trim() || null, organization_id: orgId, is_archived: false })
                    .select().single();
                if (error) throw error;
                setPlants(prev => [...prev, data]);
                setExpandedPlants(prev => new Set([...prev, data.id]));
                toast({ title: "Stabilimento creato" });
            }
            resetPlantForm();
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setSavingPlant(false);
        }
    };

    const handleEditPlant = (plant: Plant) => {
        setEditingPlantId(plant.id);
        setPlantName(plant.name);
        setPlantAddress(plant.address_line1 || "");
        setPlantCity(plant.city || "");
        setShowPlantForm(true);
    };

    const handleDeletePlant = async (id: string, name: string) => {
        if (!confirm(`Eliminare lo stabilimento "${name}" e tutte le sue linee?`)) return;
        try {
            const { error } = await supabase.from("plants").delete().eq("id", id);
            if (error) throw error;
            setPlants(prev => prev.filter(p => p.id !== id));
            setLines(prev => prev.filter(l => l.plant_id !== id));
            toast({ title: "Eliminato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    const handleToggleArchived = async (plant: Plant) => {
        try {
            const { error } = await supabase.from("plants").update({ is_archived: !plant.is_archived }).eq("id", plant.id);
            if (error) throw error;
            setPlants(prev => prev.map(p => p.id === plant.id ? { ...p, is_archived: !p.is_archived } : p));
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    // ========== LINE CRUD ==========
    const resetLineForm = () => {
        setLineName(""); setLineCode(""); setLineDesc("");
        setEditingLineId(null); setShowLineForm(null);
    };

    const handleSaveLine = async (plantId: string) => {
        if (!lineName.trim()) return;
        setSavingLine(true);
        try {
            if (editingLineId) {
                const { error } = await supabase.from("production_lines")
                    .update({ name: lineName.trim(), code: lineCode.trim() || null, description: lineDesc.trim() || null })
                    .eq("id", editingLineId);
                if (error) throw error;
                setLines(prev => prev.map(l => l.id === editingLineId
                    ? { ...l, name: lineName.trim(), code: lineCode.trim() || null, description: lineDesc.trim() || null }
                    : l));
                toast({ title: "Linea aggiornata" });
            } else {
                const { data, error } = await supabase.from("production_lines")
                    .insert({ name: lineName.trim(), code: lineCode.trim() || null, description: lineDesc.trim() || null, plant_id: plantId, organization_id: orgId, is_archived: false })
                    .select().single();
                if (error) throw error;
                setLines(prev => [...prev, data]);
                toast({ title: "Linea creata" });
            }
            resetLineForm();
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally {
            setSavingLine(false);
        }
    };

    const handleEditLine = (line: ProductionLine) => {
        setEditingLineId(line.id);
        setLineName(line.name);
        setLineCode(line.code || "");
        setLineDesc(line.description || "");
        setShowLineForm(line.plant_id);
    };

    const handleDeleteLine = async (id: string, name: string) => {
        if (!confirm(`Eliminare la linea "${name}"?`)) return;
        try {
            const { error } = await supabase.from("production_lines").delete().eq("id", id);
            if (error) throw error;
            setLines(prev => prev.filter(l => l.id !== id));
            toast({ title: "Eliminata" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Stabilimenti - MACHINA" />
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stabilimenti</h1>
                        <p className="text-muted-foreground mt-1">Gestisci stabilimenti e linee di produzione</p>
                    </div>
                    {isAdmin && !showPlantForm && (
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => setShowPlantForm(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Nuovo Stabilimento
                        </Button>
                    )}
                </div>

                {/* Plant Form */}
                {showPlantForm && isAdmin && (
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{editingPlantId ? "Modifica Stabilimento" : "Nuovo Stabilimento"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome *</Label>
                                    <Input value={plantName} onChange={(e) => setPlantName(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="es. Stabilimento Nord" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Indirizzo</Label>
                                    <Input value={plantAddress} onChange={(e) => setPlantAddress(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="Via..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Città</Label>
                                    <Input value={plantCity} onChange={(e) => setPlantCity(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="Città" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSavePlant} disabled={savingPlant || !plantName.trim()} className="bg-green-600 hover:bg-green-700">
                                    <Save className="w-4 h-4 mr-2" />{savingPlant ? "..." : "Salva"}
                                </Button>
                                <Button variant="outline" onClick={resetPlantForm}><X className="w-4 h-4 mr-2" /> Annulla</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Plants list */}
                <div className="space-y-4">
                    {plants.map(plant => {
                        const plantLines = lines.filter(l => l.plant_id === plant.id);
                        const isExpanded = expandedPlants.has(plant.id);

                        return (
                            <div key={plant.id} className="rounded-2xl border border-blue-300 dark:border-blue-500/30 bg-card/50 overflow-hidden">
                                {/* Plant header */}
                                <div className="flex items-center justify-between px-5 py-4">
                                    <button onClick={() => togglePlant(plant.id)} className="flex items-center gap-3 flex-1">
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <div className="text-left">
                                            <span className="text-foreground font-bold text-lg">{plant.name}</span>
                                            {(plant.address_line1 || plant.city) && (
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {[plant.address_line1, plant.city].filter(Boolean).join(", ")}
                                                </p>
                                            )}
                                        </div>
                                        <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-300 dark:border-blue-500/30 ml-3">
                                            {plantLines.length} linee
                                        </Badge>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={`cursor-pointer ${!plant.is_archived ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-300 dark:border-green-500/30" : "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"}`}
                                            onClick={() => isAdmin && handleToggleArchived(plant)}
                                        >
                                            {!plant.is_archived ? "Attivo" : "Archiviato"}
                                        </Badge>
                                        {isAdmin && (
                                            <>
                                                <Button variant="ghost" size="icon" onClick={() => handleEditPlant(plant)}><Edit2 className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeletePlant(plant.id, plant.name)} className="text-red-400 hover:text-red-300">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded: production lines */}
                                {isExpanded && (
                                    <div className="px-5 pb-4 space-y-3 ml-8">
                                        {/* Existing lines */}
                                        {plantLines.map(line => (
                                            <div key={line.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-card/60">
                                                <div className="flex items-center gap-3">
                                                    <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                    <div>
                                                        <span className="text-foreground font-semibold">{line.name}</span>
                                                        {line.code && <span className="text-muted-foreground text-sm ml-2">({line.code})</span>}
                                                        {line.description && <p className="text-muted-foreground text-xs mt-0.5">{line.description}</p>}
                                                    </div>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditLine(line)}><Edit2 className="w-3 h-3" /></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLine(line.id, line.name)} className="text-red-400">
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Line form */}
                                        {showLineForm === plant.id && isAdmin ? (
                                            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-card/40 space-y-3">
                                                <p className="text-sm font-semibold text-foreground">{editingLineId ? "Modifica Linea" : "Nuova Linea"}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <Input value={lineName} onChange={(e) => setLineName(e.target.value)}
                                                        placeholder="Nome linea *" className="bg-muted border-border text-foreground" />
                                                    <Input value={lineCode} onChange={(e) => setLineCode(e.target.value)}
                                                        placeholder="Codice (opz.)" className="bg-muted border-border text-foreground" />
                                                    <Input value={lineDesc} onChange={(e) => setLineDesc(e.target.value)}
                                                        placeholder="Descrizione (opz.)" className="bg-muted border-border text-foreground" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleSaveLine(plant.id)} disabled={savingLine || !lineName.trim()} className="bg-green-600 hover:bg-green-700">
                                                        <Save className="w-3 h-3 mr-1" />{savingLine ? "..." : "Salva"}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={resetLineForm}><X className="w-3 h-3 mr-1" /> Annulla</Button>
                                                </div>
                                            </div>
                                        ) : isAdmin && (
                                            <Button variant="outline" size="sm" onClick={() => { resetLineForm(); setShowLineForm(plant.id); }}
                                                className="border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                                                <Plus className="w-3 h-3 mr-2" /> Aggiungi Linea
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {plants.length === 0 && (
                    <Card className="bg-card border-border p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessuno stabilimento</h3>
                        <p className="text-muted-foreground">Aggiungi il primo stabilimento per organizzare le macchine</p>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
