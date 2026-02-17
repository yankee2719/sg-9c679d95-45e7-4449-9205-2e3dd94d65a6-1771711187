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
import { Building2, Plus, Trash2, Edit2, Save, X, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plant {
    id: string;
    name: string;
    is_archived: boolean;
    address_line1?: string | null;
    city?: string | null;
    organization_id: string | null;
}

export default function PlantsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState < string | null > (null);
    const [formName, setFormName] = useState("");
    const [formAddress, setFormAddress] = useState("");
    const [formCity, setFormCity] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);
                setOrgId(ctx.orgId);

                const { data } = await supabase
                    .from("plants")
                    .select("*")
                    .order("name");
                if (data) setPlants(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const resetForm = () => {
        setFormName("");
        setFormAddress("");
        setFormCity("");
        setEditingId(null);
        setShowForm(false);
    };

    const handleSave = async () => {
        if (!formName.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase.from("plants")
                    .update({ name: formName.trim(), address_line1: formAddress.trim() || null, city: formCity.trim() || null })
                    .eq("id", editingId);
                if (error) throw error;
                setPlants(prev => prev.map(p => p.id === editingId ? { ...p, name: formName.trim(), address_line1: formAddress.trim() || null, city: formCity.trim() || null } : p));
                toast({ title: "Aggiornato", description: "Stabilimento aggiornato" });
            } else {
                const { data, error } = await supabase.from("plants")
                    .insert({ name: formName.trim(), address_line1: formAddress.trim() || null, city: formCity.trim() || null, organization_id: orgId, is_archived: false })
                    .select()
                    .single();
                if (error) throw error;
                setPlants(prev => [...prev, data]);
                toast({ title: "Creato", description: "Stabilimento creato" });
            }
            resetForm();
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message || "Errore", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (plant: Plant) => {
        setEditingId(plant.id);
        setFormName(plant.name);
        setFormAddress(plant.address_line1 || "");
        setFormCity(plant.city || "");
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Eliminare lo stabilimento "${name}"?`)) return;
        try {
            const { error } = await supabase.from("plants").delete().eq("id", id);
            if (error) throw error;
            setPlants(prev => prev.filter(p => p.id !== id));
            toast({ title: "Eliminato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message || "Errore", variant: "destructive" });
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

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Stabilimenti - MACHINA" />
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Stabilimenti</h1>
                        <p className="text-muted-foreground mt-1">Gestisci gli stabilimenti della tua organizzazione</p>
                    </div>
                    {isAdmin && !showForm && (
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Nuovo Stabilimento
                        </Button>
                    )}
                </div>

                {/* Form */}
                {showForm && isAdmin && (
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{editingId ? "Modifica Stabilimento" : "Nuovo Stabilimento"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome *</Label>
                                    <Input value={formName} onChange={(e) => setFormName(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="es. Stabilimento Nord" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Indirizzo</Label>
                                    <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="Via..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Città</Label>
                                    <Input value={formCity} onChange={(e) => setFormCity(e.target.value)}
                                        className="bg-muted border-border text-foreground" placeholder="Città" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving || !formName.trim()} className="bg-green-600 hover:bg-green-700">
                                    <Save className="w-4 h-4 mr-2" />{saving ? "Salvataggio..." : "Salva"}
                                </Button>
                                <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-2" /> Annulla</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Plants list */}
                <div className="space-y-3">
                    {plants.map(plant => (
                        <Card key={plant.id} className="bg-card border-border">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-bold">{plant.name}</h3>
                                        {(plant.address_line1 || plant.city) && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {[plant.address_line1, plant.city].filter(Boolean).join(", ")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        className={`cursor-pointer ${!plant.is_archived ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}
                                        onClick={() => isAdmin && handleToggleArchived(plant)}
                                    >
                                        {!plant.is_archived ? "Attivo" : "Inattivo"}
                                    </Badge>
                                    {isAdmin && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(plant)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(plant.id, plant.name)} className="text-red-400 hover:text-red-300">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {plants.length === 0 && (
                    <Card className="bg-card border-border p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessuno stabilimento</h3>
                        <p className="text-muted-foreground">Aggiungi il primo stabilimento per organizzare le attrezzature</p>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

