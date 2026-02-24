import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Building2, QrCode, Factory } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Plant {
  id: string;
  name: string;
}

interface CustomerOrg {
  id: string;
  name: string;
}

export default function EditEquipment() {
  const router = useRouter();
  const { id } = router.query;

  const { toast } = useToast();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);

  const [userRole, setUserRole] = useState("technician");
  const [orgType, setOrgType] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // customer-mode data
  const [plants, setPlants] = useState<Plant[]>([]);

  // manufacturer-mode data
  const [customers, setCustomers] = useState<CustomerOrg[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

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

  useEffect(() => {
    const init = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx) {
          router.push("/login");
          return;
        }

        setUserRole(ctx.role ?? "technician");
        setOrgType(ctx.orgType ?? null);
        setOrgId(ctx.orgId ?? null);

        // Carica dati macchina
        if (id && typeof id === "string") {
          await loadMachine(id);
        }

        // Se manufacturer: carico clienti e assegnazione
        if ((ctx.orgType ?? null) === "manufacturer" && ctx.orgId) {
          const { data: custData, error: custErr } = await supabase
            .from("organizations")
            .select("id,name")
            .eq("manufacturer_org_id", ctx.orgId)
            .eq("type", "customer")
            .order("name", { ascending: true });

          if (custErr) console.error("customers load:", custErr);
          setCustomers((custData ?? []) as any);

          // preseleziona cliente attuale (se esiste) per questa macchina
          if (id && typeof id === "string") {
            const { data: asg, error: asgErr } = await supabase
              .from("machine_assignments")
              .select("customer_org_id")
              .eq("machine_id", id)
              .eq("manufacturer_org_id", ctx.orgId)
              .eq("is_active", true)
              .order("assigned_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (asgErr) console.error("assignment load:", asgErr);
            if ((asg as any)?.customer_org_id) {
              setSelectedCustomerId((asg as any).customer_org_id);
            }
          }
        } else {
          // Se customer: carico plants
          const { data: pData, error: pErr } = await supabase
            .from("plants")
            .select("id, name")
            .eq("is_archived", false)
            .order("name");

          if (pErr) console.error("plants load:", pErr);
          setPlants((pData ?? []) as any);
        }
      } catch (e: any) {
        console.error(e);
        toast({
          title: t("common.error"),
          description: e?.message ?? "Errore caricamento pagina",
          variant: "destructive",
        });
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadMachine = async (machineId: string) => {
    try {
      const { data, error } = await supabase.from("machines").select("*").eq("id", machineId).single();
      if (error) throw error;

      const specs = data.specifications
        ? typeof data.specifications === "string"
          ? data.specifications
          : data.specifications?.text || JSON.stringify(data.specifications)
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
      // Update machines base fields
      const updatePayload: any = {
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
        qr_code_token: formData.qr_code_token.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Customer can set plant_id, manufacturer should NOT manage it here
      if (!isManufacturer) {
        updatePayload.plant_id = formData.plant_id || null;
      }

      const { error: upErr } = await supabase.from("machines").update(updatePayload).eq("id", id);
      if (upErr) throw upErr;

      // Manufacturer: set assignment to customer
      if (isManufacturer) {
        if (!orgId) throw new Error("Organization non trovata.");
        if (!selectedCustomerId) throw new Error("Seleziona un cliente.");

        // disattiva eventuali assegnazioni precedenti per questa macchina (di questo manufacturer)
        const { error: deactErr } = await supabase
          .from("machine_assignments")
          .update({ is_active: false })
          .eq("machine_id", id)
          .eq("manufacturer_org_id", orgId)
          .eq("is_active", true);

        if (deactErr) console.error("assignment deactivate (non-fatal):", deactErr);

        // crea nuova assegnazione attiva
        const { error: insErr } = await supabase.from("machine_assignments").insert({
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
      toast({ title: t("common.error"), description: error?.message || "Errore", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
                        Nessun cliente trovato. Crea prima un cliente, poi assegna la macchina.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" /> Stabilimento
                    </Label>
                    <Select value={formData.plant_id} onValueChange={(v) => setFormData({ ...formData, plant_id: v })}>
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
                  <Select value={formData.lifecycle_state} onValueChange={(v) => setFormData({ ...formData, lifecycle_state: v })}>
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
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? t("equipment.saving") : t("common.save")}
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