import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
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

export default function NewEquipment() {
    const router = useRouter();
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
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const ctx = await getUserContext();
            const { error } = await supabase.from("machines").insert({
                name: formData.name.trim(),
                internal_code: formData.internal_code.trim(),
                category: formData.category.trim() || null,
                brand: formData.brand.trim() || null,
                model: formData.model.trim() || null,
                serial_number: formData.serial_number.trim() || null,
                position: formData.position.trim() || null,
                lifecycle_state: formData.lifecycle_state || "active",
                specifications: formData.specifications.trim() ? { text: formData.specifications.trim() } : null,
                notes: formData.notes.trim() || null,
                plant_id: formData.plant_id || null,
                qr_code_token: formData.qr_code_token.trim() || null,
                organization_id: ctx?.orgId,
                created_by: ctx?.userId,
            });
            if (error) throw error;
            toast({ title: t("common.success"), description: t("equipment.saveEquipment") });
            router.push("/equipment");
        } catch (error: any) {
            toast({ title: t("common.error"), description: error?.message || "Errore", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    return (
        <MainLayout>
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/equipment")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">{t("equipment.new")}</h1>
                </div>

                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-foreground">{t("equipment.information")}</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <p className="text-xs text-muted-foreground">URL codificato nel QR Code</p>
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
                                    className="bg-muted border-border text-foreground min-h-[100px]" placeholder={t("equipment.technicalSpecsPlaceholder")} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">{t("common.notes")}</Label>
                                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="bg-muted border-border text-foreground min-h-[100px]" placeholder={t("equipment.notesPlaceholder")} />
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={() => router.push("/equipment")}>{t("common.cancel")}</Button>
                                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="mr-2 h-4 w-4" />{loading ? t("equipment.saving") : t("equipment.saveEquipment")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}