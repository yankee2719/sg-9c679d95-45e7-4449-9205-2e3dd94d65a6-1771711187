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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Users,
    Phone,
    Mail,
} from "lucide-react";

interface Plant {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    plant_type: "plant" | "customer";
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    country: string | null;
    plant_manager_name: string | null;
    plant_manager_email: string | null;
    plant_manager_phone: string | null;
    is_archived: boolean;
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
    const [viewMode, setViewMode] = useState < "plant" | "customer" > ("plant");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingPlant, setEditingPlant] = useState < Plant | null > (null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        plant_type: "plant" as "plant" | "customer",
        address_line1: "",
        address_line2: "",
        city: "",
        province: "",
        postal_code: "",
        country: "IT",
        plant_manager_name: "",
        plant_manager_email: "",
        plant_manager_phone: "",
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
                .eq("is_archived", false)
                .order("name", { ascending: true });

            if (error) throw error;

            // Machine counts
            const { data: machineCounts } = await supabase
                .from("machines")
                .select("plant_id")
                .eq("organization_id", organizationId)
                .eq("is_archived", false);

            const countMap: Record<string, number> = {};
            machineCounts?.forEach(m => {
                if (m.plant_id) countMap[m.plant_id] = (countMap[m.plant_id] || 0) + 1;
            });

            setPlants((data || []).map(p => ({
                ...p,
                plant_type: p.plant_type || "plant",
                machine_count: countMap[p.id] || 0,
            })));
        } catch (error) {
            console.error("Error loading plants:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i dati" });
        }
    };

    const displayedPlants = plants
        .filter(p => p.plant_type === viewMode)
        .filter(p => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) ||
                p.code?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q) ||
                p.plant_manager_name?.toLowerCase().includes(q);
        });

    const plantCount = plants.filter(p => p.plant_type === "plant").length;
    const customerCount = plants.filter(p => p.plant_type === "customer").length;

    const openCreateDialog = () => {
        setEditingPlant(null);
        setFormData({
            name: "", code: "", description: "",
            plant_type: viewMode,
            address_line1: "", address_line2: "", city: "", province: "", postal_code: "", country: "IT",
            plant_manager_name: "", plant_manager_email: "", plant_manager_phone: "",
        });
        setDialogOpen(true);
    };

    const openEditDialog = (plant: Plant) => {
        setEditingPlant(plant);
        setFormData({
            name: plant.name,
            code: plant.code || "",
            description: plant.description || "",
            plant_type: plant.plant_type || "plant",
            address_line1: plant.address_line1 || "",
            address_line2: plant.address_line2 || "",
            city: plant.city || "",
            province: plant.province || "",
            postal_code: plant.postal_code || "",
            country: plant.country || "IT",
            plant_manager_name: plant.plant_manager_name || "",
            plant_manager_email: plant.plant_manager_email || "",
            plant_manager_phone: plant.plant_manager_phone || "",
        });
        setDialogOpen(true);
    };

    const buildPayload = () => ({
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        plant_type: formData.plant_type,
        address_line1: formData.address_line1.trim() || null,
        address_line2: formData.address_line2.trim() || null,
        city: formData.city.trim() || null,
        province: formData.province.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || "IT",
        plant_manager_name: formData.plant_manager_name.trim() || null,
        plant_manager_email: formData.plant_manager_email.trim() || null,
        plant_manager_phone: formData.plant_manager_phone.trim() || null,
    });

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast({ variant: "destructive", title: "Errore", description: "Il nome è obbligatorio" });
            return;
        }
        if (!orgId) return;

        setSaving(true);
        try {
            const payload = buildPayload();

            if (editingPlant) {
                const { error } = await supabase
                    .from("plants")
                    .update(payload)
                    .eq("id", editingPlant.id);
                if (error) throw error;
                toast({ title: "✅ Aggiornato con successo" });
            } else {
                const { error } = await supabase
                    .from("plants")
                    .insert({ ...payload, organization_id: orgId });
                if (error) throw error;
                toast({ title: viewMode === "plant" ? "✅ Stabilimento creato" : "✅ Cliente creato" });
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
            toast({ variant: "destructive", title: "Errore", description: "Non puoi eliminare con macchine associate. Rimuovi prima le macchine." });
            setDeleteDialogOpen(false);
            return;
        }

        setDeleting(true);
        try {
            // Soft delete
            const { error } = await supabase
                .from("plants")
                .update({ is_archived: true })
                .eq("id", plantToDelete.id);
            if (error) throw error;

            toast({ title: "✅ Eliminato" });
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

    const getTypeLabel = () => viewMode === "plant" ? "Stabilimento" : "Cliente";
    const getTypeLabelPlural = () => viewMode === "plant" ? "Stabilimenti" : "Clienti";
    const getTypeIcon = () => viewMode === "plant" ? Building2 : Users;
    const TypeIcon = getTypeIcon();

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
            <SEO title={`${getTypeLabelPlural()} - MACHINA`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <TypeIcon className="h-8 w-8 text-primary" />
                            {getTypeLabelPlural()}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            {viewMode === "plant"
                                ? "Gestisci gli stabilimenti e le sedi operative"
                                : "Gestisci le sedi dei clienti"}
                        </p>
                    </div>
                    {userRole === "admin" && (
                        <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                            <Plus className="h-5 w-5 mr-2" />
                            Nuovo {getTypeLabel().toLowerCase()}
                        </Button>
                    )}
                </div>

                {/* Toggle Stabilimenti / Clienti */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={viewMode === "plant" ? "default" : "outline"}
                        onClick={() => setViewMode("plant")}
                        className="gap-2"
                    >
                        <Building2 className="h-4 w-4" />
                        Stabilimenti ({plantCount})
                    </Button>
                    <Button
                        variant={viewMode === "customer" ? "default" : "outline"}
                        onClick={() => setViewMode("customer")}
                        className="gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Clienti ({customerCount})
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Totale {getTypeLabelPlural().toLowerCase()}</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">{displayedPlants.length}</p>
                                </div>
                                <TypeIcon className="h-12 w-12 text-blue-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Macchine associate</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">
                                        {displayedPlants.reduce((sum, p) => sum + (p.machine_count || 0), 0)}
                                    </p>
                                </div>
                                <Factory className="h-12 w-12 text-orange-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Con referente</p>
                                    <p className="text-3xl font-bold text-foreground mt-2">
                                        {displayedPlants.filter(p => p.plant_manager_name).length}
                                    </p>
                                </div>
                                <Users className="h-12 w-12 text-green-500 opacity-20" />
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
                                placeholder={`Cerca ${getTypeLabel().toLowerCase()} per nome, codice, città o referente...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                {displayedPlants.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                {plants.filter(p => p.plant_type === viewMode).length === 0
                                    ? `Nessun ${getTypeLabel().toLowerCase()}`
                                    : "Nessun risultato"}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {plants.filter(p => p.plant_type === viewMode).length === 0
                                    ? `Crea il primo ${getTypeLabel().toLowerCase()} per iniziare`
                                    : "Prova a cambiare i criteri di ricerca"}
                            </p>
                            {plants.filter(p => p.plant_type === viewMode).length === 0 && userRole === "admin" && (
                                <Button onClick={openCreateDialog}>
                                    <Plus className="h-5 w-5 mr-2" />
                                    Crea {getTypeLabel().toLowerCase()}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedPlants.map((plant) => (
                            <Card key={plant.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${viewMode === "plant" ? "bg-primary/10" : "bg-blue-500/10"}`}>
                                                <TypeIcon className={`h-5 w-5 ${viewMode === "plant" ? "text-primary" : "text-blue-500"}`} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg text-foreground">{plant.name}</CardTitle>
                                                {plant.code && (
                                                    <p className="text-sm text-muted-foreground">Cod. {plant.code}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(plant.address_line1 || plant.city) && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>
                                                {[plant.address_line1, plant.city, plant.province].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    )}

                                    {plant.plant_manager_name && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4 shrink-0" />
                                            <span>{plant.plant_manager_name}</span>
                                        </div>
                                    )}

                                    {plant.plant_manager_phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4 shrink-0" />
                                            <span>{plant.plant_manager_phone}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-sm">
                                        <Factory className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-foreground font-medium">{plant.machine_count || 0}</span>
                                        <span className="text-muted-foreground">macchine</span>
                                    </div>

                                    {plant.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">{plant.description}</p>
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
                <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {editingPlant ? `Modifica ${getTypeLabel().toLowerCase()}` : `Nuovo ${getTypeLabel().toLowerCase()}`}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {editingPlant ? "Aggiorna i dati" : `Crea un nuovo ${getTypeLabel().toLowerCase()}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Type selector */}
                        <div className="space-y-2">
                            <Label>Tipo *</Label>
                            <Select value={formData.plant_type}
                                onValueChange={(v: "plant" | "customer") => setFormData({ ...formData, plant_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="plant">Stabilimento</SelectItem>
                                    <SelectItem value="customer">Cliente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={formData.plant_type === "plant" ? "es. Stabilimento Nord" : "es. Acme S.r.l."} />
                            </div>
                            <div className="space-y-2">
                                <Label>Codice</Label>
                                <Input value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder={formData.plant_type === "plant" ? "es. STAB-01" : "es. CLI-001"} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Indirizzo</Label>
                            <Input value={formData.address_line1}
                                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                placeholder="Via/Piazza..." />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Città</Label>
                                <Input value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="es. Milano" />
                            </div>
                            <div className="space-y-2">
                                <Label>Provincia</Label>
                                <Input value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    placeholder="es. MI" />
                            </div>
                            <div className="space-y-2">
                                <Label>CAP</Label>
                                <Input value={formData.postal_code}
                                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                    placeholder="es. 20100" />
                            </div>
                        </div>

                        <div className="border-t border-border pt-4">
                            <p className="text-sm font-medium text-foreground mb-3">
                                {formData.plant_type === "plant" ? "Responsabile stabilimento" : "Referente cliente"}
                            </p>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Nome referente</Label>
                                    <Input value={formData.plant_manager_name}
                                        onChange={(e) => setFormData({ ...formData, plant_manager_name: e.target.value })}
                                        placeholder="es. Mario Rossi" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input type="email" value={formData.plant_manager_email}
                                            onChange={(e) => setFormData({ ...formData, plant_manager_email: e.target.value })}
                                            placeholder="email@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Telefono</Label>
                                        <Input type="tel" value={formData.plant_manager_phone}
                                            onChange={(e) => setFormData({ ...formData, plant_manager_phone: e.target.value })}
                                            placeholder="+39 ..." />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Note</Label>
                            <Textarea value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Note aggiuntive..." rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                            Annulla
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                                : editingPlant ? "Salva modifiche" : `Crea ${getTypeLabel().toLowerCase()}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Elimina {getTypeLabel().toLowerCase()}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Vuoi eliminare <strong>{plantToDelete?.name}</strong>? Verrà archiviato.
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
