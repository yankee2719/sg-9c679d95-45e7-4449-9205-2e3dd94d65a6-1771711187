import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Plant { id: string; name: string; }

export default function EditEquipment() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState("technician");
    const [plants, setPlants] = useState < Plant[] > ([]);

    const [formData, setFormData] = useState({
        name: "",
        internal_code: "",
        category: "",
        brand: "",
        model: "",
        serial_number: "",
        position: "",
        lifecycle_state: "active",
        specifications: "",
        notes: "",
        plant_id: "",
        qr_code_token: "",
    });

    useEffect(() => {
        const init = async () => {
            const ctx = await getUserContext();
            if (ctx) setUserRole(ctx.role);
            const { data } = await supabase.from("plants").select("id, name").eq("is_archived", false).order("name");
            if (data) setPlants(data);
            if (id && typeof id === "string") loadMachine(id);
        };
        init();
    }, [id]);

    const loadMachine = async (machineId: string) => {
        try {
            const { data, error } = await supabase.from("machines").select("*").eq("id", machineId).single();
            if (error) throw error;
            const specs = data.specifications
                ? (typeof data.specifications === "string" ? data.specifications : data.specifications?.text || JSON.stringify(data.specifications))
                : "";
            setFormData({
                name: data.name || "",
                internal_code: data.internal_code || "",
                category: data.category || "",
                brand: data.brand || "",
                model: data.model || "",
                serial_number: data.serial_number || "",
                position: data.position || "",
                lifecycle_state: data.lifecycle_state || "active",
                specifications: specs,
                notes: data.notes || "",
                plant_id: data.plant_id || "",
                qr_code_token: data.qr_code_token || "",
            });
        } catch (error) {
            toast({ title: t("common.error"), description: "Impossibile caricare", variant: "destructive" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || typeof id !== "string") return;
        setLoading(true);
        try {
            const { error } = await supabase.from("machines").update({
                name: formData.name.trim(),
                internal_code: formData.internal_code.trim(),
                category: formData.category.trim() || null,
                brand: formData.brand.trim() || null,
                model: formData.model.trim() || null,
                serial_number: formData.serial_number.trim() || null,
                position: formData.position.trim() || null,
                lifecycle_state: formData.lifecycle_state,
                specifications: formData.specifications.trim() ? { text: formData.specifications.trim() } : null,
                notes: formData.notes.trim() || null,
                plant_id: formData.plant_id || null,
                qr_code_token: formData.qr_code_token.trim() || null,
                updated_at: new Date().toISOString(),
            }).eq("id", id);
            if (error) throw error;
            toast({ title: t("common.success"), description: "Attrezzatura aggiornata" });
            router.push(`/equipment/${id}`);
        } catch (error: any) {
            toast({ title: t("common.error"), description: error?.message || "Errore", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    return (
        <MainLayout>
            <SEO title="Modifica Attrezzatura - MACHINA" />
            <div className="container mx-auto p-6 max-w-4xl">
                <div className="mb-6">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">{t("equipment.edit")}</h1>
                </div>

                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-foreground">{t("equipment.information")}</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.name")} *</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-muted border-border text-foreground" required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.code")} *</Label>
                                    <Input value={formData.internal_code} onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                                        className="bg-muted border-border text-foreground" required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-blue-400" /> Stabilimento
                                    </Label>
                                    <Select value={formData.plant_id} onValueChange={(v) => setFormData({ ...formData, plant_id: v })}>
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue placeholder="Seleziona stabilimento..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isAdmin && (
                                    <div className="space-y-2">
                                        <Label className="text-foreground flex items-center gap-2">
                                            <QrCode className="w-4 h-4 text-primary" /> URL QR Code
                                        </Label>
                                        <Input value={formData.qr_code_token} onChange={(e) => setFormData({ ...formData, qr_code_token: e.target.value })}
                                            placeholder="https://esempio.com/manuale.pdf" className="bg-muted border-border text-foreground" />
                                        <p className="text-xs text-muted-foreground">Lascia vuoto per usare il link alla scheda</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.category")}</Label>
                                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Marca</Label>
                                    <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.model")}</Label>
                                    <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.serialNumber")}</Label>
                                    <Input value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Posizione</Label>
                                    <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.status")}</Label>
                                    <Select value={formData.lifecycle_state} onValueChange={(v) => setFormData({ ...formData, lifecycle_state: v })}>
                                        <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Attivo</SelectItem>
                                            <SelectItem value="inactive">Inattivo</SelectItem>
                                            <SelectItem value="under_maintenance">In Manutenzione</SelectItem>
                                            <SelectItem value="decommissioned">Dismesso</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">{t("equipment.technicalSpecs")}</Label>
                                <Textarea value={formData.specifications} onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                                    className="bg-muted border-border text-foreground" rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">{t("common.notes")}</Label>
                                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="bg-muted border-border text-foreground" rows={3} />
                            </div>
                            <div className="flex gap-4">
                                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="mr-2 h-4 w-4" />{loading ? t("equipment.saving") : t("common.save")}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.back()}>{t("common.cancel")}</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}