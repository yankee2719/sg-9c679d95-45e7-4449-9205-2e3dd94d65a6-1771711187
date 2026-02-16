import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Loader2,
    MapPin,
    AlertCircle,
    Search,
    Factory,
} from "lucide-react";

interface Plant {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    machine_count?: number;
}

export default function PlantsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();

    const [userRole, setUserRole] = useState < string | null > (null);
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [plants, setPlants] = useState < Plant[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlant, setEditingPlant] = useState < Plant | null > (null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        city: "",
        country: "IT",
        notes: "",
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [plantToDelete, setPlantToDelete] = useState < Plant | null > (null);

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { router.push("/login"); return; }

                const profileData = await getProfileData(user.id);
                if (!profileData) { router.push("/login"); return; }

                // Only admin and supervisor can manage plants
                if (!["admin", "supervisor"].includes(profileData.role || "")) {
                    router.push("/dashboard");
                    return;
                }

                setUserRole(profileData.role);
                setOrgId(profileData.organizationId);
                await loadPlants(profileData.organizationId);
            } catch (error) {
                console.error("Init error:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const loadPlants = async (organizationId: string | null) => {
        if (!organizationId) return;
        try {
            const { data, error } = await supabase
                .from("plants")
                .select("*")
                .eq("organization_id", organizationId)
                .order("name", { ascending: true });

            if (error) throw error;

            // Get machine counts per plant
            const { data: machineCounts } = await supabase
                .from("machines")
                .select("plant_id")
                .eq("organization_id", organizationId)
                .eq("is_archived", false);

            const countMap: Record<string, number> = {};
            machineCounts?.forEach(m => {
                if (m.plant_id) {
                    countMap[m.plant_id] = (countMap[m.plant_id] || 0) + 1;
                }
            });

            setPlants((data || []).map(p => ({
                ...p,
                machine_count: countMap[p.id] || 0,
            })));
        } catch (error) {
            console.error("Error loading plants:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli stabilimenti" });
        }
    };

    const filteredPlants = searchQuery.trim()
        ? plants.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.city?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : plants;

    const openCreateDialog = () => {
        setEditingPlant(null);
        setFormData({ name: "", code: "", address: "", city: "", country: "IT", notes: "" });
        setDialogOpen(true);
    };

    const openEditDialog = (plant: Plant) => {
        setEditingPlant(plant);
        setFormData({
            name: plant.name,
            code: plant.code || "",
            address: plant.address || "",
            city: plant.city || "",
            country: plant.country || "IT",
            notes: plant.notes || "",
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast({ variant: "destructive", title: "Errore", description: "Il nome è obbligatorio" });
            return;
        }
        if (!orgId) return;

        setSaving(true);
        try {
            if (editingPlant) {
                // Update
                const { error } = await supabase
                    .from("plants")
                    .update({
                        name: formData.name.trim(),
                        code: formData.code.trim() || null,
                        address: formData.address.trim() || null,
                        city: formData.city.trim() || null,
                        country: formData.country.trim() || null,
                        notes: formData.notes.trim() || null,
                    })
                    .eq("id", editingPlant.id);

                if (error) throw error;
                toast({ title: "✅ Stabilimento aggiornato" });
            } else {
                // Create
                const { error } = await supabase
                    .from("plants")
                    .insert({
                        organization_id: orgId,
                        name: formData.name.trim(),
                        code: formData.code.trim() || null,
                        address: formData.address.trim() || null,
                        city: formData.city.trim() || null,
                        country: formData.country.trim() || "IT",
                        notes: formData.notes.trim() || null,
                    });

                if (error) throw error;
                toast({ title: "✅ Stabilimento creato" });
            }

            setDialogOpen(false);
            await loadPlants(orgId);
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ variant: "destructive", title: "Errore", description: error.message || "Salvataggio fallito" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!plantToDelete || !orgId) return;

        if ((plantToDelete.machine_count || 0) > 0) {
            toast({ variant: "destructive", title: "Errore", description: "Non puoi eliminare uno stabilimento con macchine associate" });
            setDeleteDialogOpen(false);
            return;
        }

        setDeleting(true);
        try {
            const { error } = await supabase
                .from("plants")
                .delete()
                .eq("id", plantToDelete.id);

            if (error) throw error;
            toast({ title: "✅ Stabilimento eliminato" });
            setDeleteDialogOpen(false);
            setPlantToDelete(null);
            await loadPlants(orgId);
        } catch (error: any) {
            console.error("Delete error:", error);
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <SEO title="Stabilimenti - MACHINA" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Building2 className="h-8 w-8 text-primary" />
                            Stabilimenti
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Gestisci gli stabilimenti e le sedi operative
                        </p>
                    </div>
                    {userRole === "admin" && (
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Plus className="h-5 w-5 mr-2" />
                            Nuovo stabilimento
                        </Button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Totale stabilimenti</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{plants.length}</p>
                                </div>
                                <Building2 className="h-12 w-12 text-blue-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Attivi</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">
                                        {plants.filter(p => p.is_active !== false).length}
                                    </p>
                                </div>
                                <Factory className="h-12 w-12 text-green-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Macchine totali</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">
                                        {plants.reduce((sum, p) => sum + (p.machine_count || 0), 0)}
                                    </p>
                                </div>
                                <Factory className="h-12 w-12 text-orange-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Cerca stabilimento per nome, codice o città..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Plant list */}
                {filteredPlants.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                {plants.length === 0 ? "Nessuno stabilimento" : "Nessun risultato"}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {plants.length === 0
                                    ? "Crea il primo stabilimento per organizzare le tue macchine"
                                    : "Prova a cambiare i criteri di ricerca"}
                            </p>
                            {plants.length === 0 && userRole === "admin" && (
                                <Button onClick={openCreateDialog}>
                                    <Plus className="h-5 w-5 mr-2" />
                                    Crea stabilimento
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPlants.map((plant) => (
                            <Card key={plant.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg text-foreground">{plant.name}</CardTitle>
                                                {plant.code && (
                                                    <p className="text-sm text-muted-foreground">Cod. {plant.code}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={plant.is_active !== false
                                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                                            : "bg-red-500/20 text-red-400 border-red-500/30"}>
                                            {plant.is_active !== false ? "Attivo" : "Inattivo"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(plant.address || plant.city) && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>
                                                {[plant.address, plant.city, plant.country].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm">
                                        <Factory className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-foreground font-medium">{plant.machine_count || 0}</span>
                                        <span className="text-muted-foreground">macchine</span>
                                    </div>

                                    {plant.notes && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">{plant.notes}</p>
                                    )}

                                    {userRole === "admin" && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(plant)}
                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                                <Edit className="h-4 w-4 mr-1" /> Modifica
                                            </Button>
                                            <Button size="sm" variant="ghost"
                                                onClick={() => { setPlantToDelete(plant); setDeleteDialogOpen(true); }}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                disabled={(plant.machine_count || 0) > 0}>
                                                <Trash2 className="h-4 w-4 mr-1" /> Elimina
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {editingPlant ? "Modifica stabilimento" : "Nuovo stabilimento"}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {editingPlant ? "Aggiorna i dati dello stabilimento" : "Crea un nuovo stabilimento"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="es. Stabilimento Nord" />
                        </div>
                        <div className="space-y-2">
                            <Label>Codice</Label>
                            <Input value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="es. STAB-01" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Indirizzo</Label>
                                <Input value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Via..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Città</Label>
                                <Input value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="es. Milano" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Paese</Label>
                            <Input value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                placeholder="IT" />
                        </div>
                        <div className="space-y-2">
                            <Label>Note</Label>
                            <Textarea value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Note aggiuntive..." rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Annulla
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                                : editingPlant ? "Salva modifiche" : "Crea stabilimento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Elimina stabilimento</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Vuoi eliminare <strong>{plantToDelete?.name}</strong>? Questa azione non può essere annullata.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                            Annulla
                        </Button>
                        <Button onClick={handleDelete} disabled={deleting} variant="destructive">
                            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Eliminazione...</> : "Elimina"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
