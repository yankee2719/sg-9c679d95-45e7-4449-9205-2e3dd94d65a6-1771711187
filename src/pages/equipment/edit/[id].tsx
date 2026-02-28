// src/pages/equipment/edit/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Building2, QrCode, Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type OrgType = "manufacturer" | "customer";
function normalizeOrgType(x: any): OrgType | null {
    const t = String(x ?? "").toLowerCase();
    if (t === "manufacturer") return "manufacturer";
    if (t === "customer") return "customer";
    return null;
}

interface Plant {
    id: string;
    name: string;
}

interface CustomerOrg {
    id: string;
    name: string;
}

type MachineRow = {
    id: string;
    name: string;
    internal_code: string | null;
    category: string | null;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    position: string | null;
    lifecycle_state: string | null;
    specifications: any;
    notes: string | null;
    plant_id: string | null;
    qr_code_token: string | null;
};

export default function EditEquipment() {
    const router = useRouter();
    const { id } = router.query;

    const { toast } = useToast();
    const { t } = useLanguage();

    const [saving, setSaving] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const [userRole, setUserRole] = useState("technician");
    const [orgType, setOrgType] = useState < OrgType | null > (null);
    const [orgId, setOrgId] = useState < string | null > (null);

    // customer-mode
    const [plants, setPlants] = useState < Plant[] > ([]);

    // manufacturer-mode
    const [customers, setCustomers] = useState < CustomerOrg[] > ([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState < string > ("");

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

    const isAdmin = userRole === "admin" || userRole === "supervisor";
    const isManufacturer = useMemo(() => orgType === "manufacturer", [orgType]);

    // -------------------------
    // Load machine row
    // -------------------------
    const loadMachine = async (machineId: string) => {
        const { data, error } = await supabase
            .from("machines")
            .select(
                "id,name,internal_code,category,brand,model,serial_number,position,lifecycle_state,specifications,notes,plant_id,qr_code_token"
            )
            .eq("id", machineId)
            .single();

        if (error) throw error;

        const m = data as any as MachineRow;
        const specs = m.specifications
            ? typeof m.specifications === "string"
                ? m.specifications
                : (m.specifications as any)?.text || JSON.stringify(m.specifications)
            : "";

        setFormData({
            name: m.name || "",
            internal_code: m.internal_code || "",
            category: m.category || "",
            brand: m.brand || "",
            model: m.model || "",
            serial_number: m.serial_number || "",
            position: m.position || "",
            lifecycle_state: m.lifecycle_state || "active",
            specifications: specs,
            notes: m.notes || "",
            plant_id: m.plant_id || "",
            qr_code_token: m.qr_code_token || "",
        });
    };

    // -------------------------
    // INIT (HARD GUARDED)
    // -------------------------
    useEffect(() => {
        const init = async () => {
            if (!id || typeof id !== "string") return;

            setPageLoading(true);
            try {
                const ctx: any = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }

                setUserRole(ctx.role ?? "technician");

                const effectiveOrgId =
                    ctx.orgId || ctx.organizationId || ctx.organization_id || ctx.tenant_id || null;

                if (!effectiveOrgId) throw new Error("Organization non trovata nel contesto utente.");

                const resolvedType = normalizeOrgType(ctx.orgType);

                // HARD FAIL: stop random UI
                if (!resolvedType) {
                    throw new Error("orgType non risolto - controlla RPC get_my_context / organizations.type / RLS");
                }

                setOrgId(effectiveOrgId);
                setOrgType(resolvedType);

                // Reset mode-specific state (avoid ghost UI)
                setCustomers([]);
                setPlants([]);
                setSelectedCustomerId("");

                // 1) load machine
                await loadMachine(id);

                // 2) load UI per tipo
                if (resolvedType === "manufacturer") {
                    // customers of this manufacturer
                    const { data: custData, error: custErr } = await supabase
                        .from("organizations")
                        .select("id,name")
                        .eq("manufacturer_org_id", effectiveOrgId)
                        .eq("type", "customer")
                        .order("name", { ascending: true });

                    if (custErr) throw custErr;
                    setCustomers((custData ?? []) as any);

                    // current assignment
                    const { data: asg, error: asgErr } = await supabase
                        .from("machine_assignments")
                        .select("customer_org_id")
                        .eq("machine_id", id)
                        .eq("manufacturer_org_id", effectiveOrgId)
                        .eq("is_active", true)
                        .order("assigned_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (asgErr) {
                        // non fatal
                        console.error("assignment load:", asgErr);
                    }
                    setSelectedCustomerId((asg as any)?.customer_org_id ?? "");
                } else {
                    const { data: pData, error: pErr } = await supabase
                        .from("plants")
                        .select("id, name")
                        .eq("is_archived", false)
                        .order("name");

                    if (pErr) throw pErr;
                    setPlants((pData ?? []) as any);
                }
            } catch (e: any) {
                console.error(e);
                toast({
                    title: t("common.error"),
                    description: e?.message ?? "Errore caricamento pagina",
                    variant: "destructive",
                });
                router.push("/equipment");
            } finally {
                setPageLoading(false);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, router]);

    // -------------------------
    // SUBMIT
    // -------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || typeof id !== "string") return;

        if (!orgType) {
            toast({ title: t("common.error"), description: "orgType non risolto", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const updatePayload: any = {
                name: formData.name.trim(),
                internal_code: formData.internal_code.trim(),
                category: formData.category.trim() || null,
                brand: formData.brand.trim() || null,
                model: formData.model.trim() || null,
                serial_number: formData.serial_number.trim() || null,
                position: formData.position.trim() || null,
                lifecycle_state: formData.lifecycle_state,
                specifications: formData.specifications.trim()
                    ? { text: formData.specifications.trim() }
                    : null,
                notes: formData.notes.trim() || null,
                qr_code_token: formData.qr_code_token.trim() || null,
                updated_at: new Date().toISOString(),
            };

            // Customer può gestire plant_id; Manufacturer NO
            if (orgType === "customer") {
                updatePayload.plant_id = formData.plant_id || null;
            }

            const { error: upErr } = await supabase
                .from("machines")
                .update(updatePayload)
                .eq("id", id);

            if (upErr) throw upErr;

            // Manufacturer: aggiorna assegnazione cliente
            if (orgType === "manufacturer") {
                if (!orgId) throw new Error("Organization non trovata.");
                if (!selectedCustomerId) throw new Error("Seleziona un cliente.");

                const { error: deactErr } = await supabase
                    .from("machine_assignments")
                    .update({ is_active: false })
                    .eq("machine_id", id)
                    .eq("manufacturer_org_id", orgId)
                    .eq("is_active", true);

                if (deactErr) console.error("assignment deactivate (non-fatal):", deactErr);

                const { error: insErr } = await supabase
                    .from("machine_assignments")
                    .insert({
                        machine_id: id,
                        customer_org_id: selectedCustomerId,
                        manufacturer_org_id: orgId,
                        assigned_at: new Date().toISOString(),
                        is_active: true,
                    });

                if (insErr) throw insErr;
            }

            toast({ title: t("common.success"), description: "Attrezzatura aggiornata" });
            router.push(`/equipment/${id}`);
        } catch (error: any) {
            toast({
                title: t("common.error"),
                description: error?.message || "Errore",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    // HARD GUARD RENDER (no flash wrong UI)
    if (pageLoading || !orgType) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Modifica Attrezzatura - MACHINA" />

            <div className="container mx-auto p-6 max-w-4xl">
                <div className="mb-6">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground">{t("equipment.edit")}</h1>
                </div>

                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">{t("equipment.information")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.name")} *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.code")} *</Label>
                                    <Input
                                        value={formData.internal_code}
                                        onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                        required
                                    />
                                </div>

                                {/* Manufacturer -> Customer picker | Customer -> Plant picker */}
                                {isManufacturer ? (
                                    <div className="space-y-2">
                                        <Label className="text-foreground flex items-center gap-2">
                                            <Factory className="w-4 h-4 text-purple-400" /> Cliente *
                                        </Label>

                                        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                            <SelectTrigger className="bg-muted border-border text-foreground">
                                                <SelectValue placeholder="Seleziona cliente..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {customers.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {customers.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                Nessun cliente trovato. Crea prima un cliente (organizations type=customer, manufacturer_org_id = la tua org).
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-foreground flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-blue-400" /> Stabilimento
                                        </Label>

                                        <Select
                                            value={formData.plant_id}
                                            onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                                        >
                                            <SelectTrigger className="bg-muted border-border text-foreground">
                                                <SelectValue placeholder="Seleziona stabilimento..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {plants.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div className="space-y-2">
                                        <Label className="text-foreground flex items-center gap-2">
                                            <QrCode className="w-4 h-4 text-primary" /> URL QR Code
                                        </Label>
                                        <Input
                                            value={formData.qr_code_token}
                                            onChange={(e) => setFormData({ ...formData, qr_code_token: e.target.value })}
                                            placeholder="https://esempio.com/manuale.pdf"
                                            className="bg-muted border-border text-foreground"
                                        />
                                        <p className="text-xs text-muted-foreground">Lascia vuoto per usare il link alla scheda</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.category")}</Label>
                                    <Input
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Marca</Label>
                                    <Input
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.model")}</Label>
                                    <Input
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.serialNumber")}</Label>
                                    <Input
                                        value={formData.serial_number}
                                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">Posizione</Label>
                                    <Input
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                        className="bg-muted border-border text-foreground"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("equipment.status")}</Label>
                                    <Select
                                        value={formData.lifecycle_state}
                                        onValueChange={(v) => setFormData({ ...formData, lifecycle_state: v })}
                                    >
                                        <SelectTrigger className="bg-muted border-border text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
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
                                <Textarea
                                    value={formData.specifications}
                                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                                    className="bg-muted border-border text-foreground"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground">{t("common.notes")}</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="bg-muted border-border text-foreground"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? t("equipment.saving") : t("common.save")}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => router.back()}>
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}