import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import {
    ArrowLeft, Wrench, Building2, MapPin, Calendar, Hash, Tag,
    QrCode, FileText, ClipboardList, Pencil, Save, X, Factory, Lock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Machine {
    id: string;
    name: string;
    internal_code: string;
    serial_number: string | null;
    brand: string | null;
    model: string | null;
    category: string | null;
    lifecycle_state: string | null;
    position: string | null;
    commissioned_at: string | null;
    specifications: any;
    notes: string | null;
    plant_id: string | null;
    qr_code_token: string | null;
    photo_url: string | null;
    year_of_manufacture: number | null;
    organization_id: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Attivo", className: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
    commissioned: { label: "Attivo", className: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" },
    inactive: { label: "Inattivo", className: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30" },
    under_maintenance: { label: "In Manutenzione", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" },
    decommissioned: { label: "Dismesso", className: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30" },
};

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { id } = router.query;

    const [machine, setMachine] = useState < Machine | null > (null);
    const [plantName, setPlantName] = useState < string | null > (null);
    const [manufacturerName, setManufacturerName] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [ctx, setCtx] = useState < UserContext | null > (null);
    const [editingQR, setEditingQR] = useState(false);
    const [qrUrlDraft, setQrUrlDraft] = useState("");
    const [savingQR, setSavingQR] = useState(false);

    // Derived
    const isAssigned = machine && ctx ? machine.organization_id !== ctx.orgId : false;
    const isAdmin = ctx?.role === "admin" || ctx?.role === "supervisor";
    const canEdit = isAdmin && !isAssigned;

    useEffect(() => {
        if (id) loadAll(id as string);
    }, [id]);

    async function loadAll(machineId: string) {
        try {
            const userCtx = await getUserContext();
            if (userCtx) setCtx(userCtx);

            const { data, error } = await supabase.from("machines").select("*").eq("id", machineId).single();
            if (error) throw error;
            setMachine(data);
            setQrUrlDraft(data.qr_code_token || "");

            if (data.plant_id) {
                const { data: plant } = await supabase.from("plants").select("name").eq("id", data.plant_id).single();
                if (plant) setPlantName(plant.name);
            }

            // If machine belongs to another org (manufacturer), get their name
            if (userCtx && data.organization_id && data.organization_id !== userCtx.orgId) {
                const { data: mfrOrg } = await supabase.from("organizations").select("name").eq("id", data.organization_id).single();
                if (mfrOrg) setManufacturerName(mfrOrg.name);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveQR = async () => {
        if (!machine) return;
        setSavingQR(true);
        try {
            const { error } = await supabase.from("machines")
                .update({ qr_code_token: qrUrlDraft.trim() || null })
                .eq("id", machine.id);
            if (error) throw error;
            setMachine({ ...machine, qr_code_token: qrUrlDraft.trim() || null });
            setEditingQR(false);
            toast({ title: "Salvato", description: "URL QR Code aggiornato" });
        } catch {
            toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" });
        } finally {
            setSavingQR(false);
        }
    };

    if (loading) return <MainLayout><div className="container mx-auto py-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-1/3" /><div className="h-64 bg-muted rounded" /></div></div></MainLayout>;

    if (!machine) return (
        <MainLayout>
            <div className="container mx-auto py-6 text-center">
                <p className="text-red-400 text-lg">Macchina non trovata</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/equipment")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla lista
                </Button>
            </div>
        </MainLayout>
    );

    const status = statusConfig[machine.lifecycle_state || "active"] || statusConfig.active;
    const qrValue = machine.qr_code_token || `${typeof window !== "undefined" ? window.location.origin : ""}/equipment/${machine.id}`;
    const specsText = machine.specifications
        ? (typeof machine.specifications === "string" ? machine.specifications : machine.specifications?.text || JSON.stringify(machine.specifications))
        : null;

    return (
        <MainLayout>
            <div className="container mx-auto py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/equipment")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
                            <p className="text-sm text-muted-foreground">{machine.internal_code}</p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                        {isAssigned && (
                            <Badge className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30 flex items-center gap-1">
                                <Factory className="w-3 h-3" /> {manufacturerName || "Costruttore"}
                            </Badge>
                        )}
                    </div>
                    {canEdit && (
                        <Button onClick={() => router.push(`/equipment/edit/${machine.id}`)} className="bg-blue-600 hover:bg-blue-700">
                            <Pencil className="mr-2 h-4 w-4" /> Modifica
                        </Button>
                    )}
                </div>

                {/* Read-only notice for assigned machines */}
                {isAssigned && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-500/30">
                        <Lock className="w-5 h-5 text-purple-400 shrink-0" />
                        <div>
                            <p className="text-foreground font-medium">Macchina fornita da {manufacturerName || "costruttore"}</p>
                            <p className="text-muted-foreground text-sm">Documentazione e specifiche gestite dal costruttore. Puoi creare manutenzioni e checklist.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info generali */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-primary" /> Informazioni Generali
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={machine.internal_code} />
                                <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={machine.category} />
                                <InfoRow icon={<Wrench className="w-4 h-4" />} label="Marca" value={machine.brand} />
                                <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={machine.model} />
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="N. Serie" value={machine.serial_number} />
                                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Anno Fabbricazione" value={machine.year_of_manufacture?.toString()} />
                                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Data Commissione" value={machine.commissioned_at ? new Date(machine.commissioned_at).toLocaleDateString("it-IT") : null} />
                            </CardContent>
                        </Card>

                        {/* Ubicazione */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" /> Ubicazione
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Stabilimento" value={plantName} fallback="Non assegnato" />
                                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Posizione" value={machine.position} />
                                {isAssigned && manufacturerName && (
                                    <InfoRow icon={<Factory className="w-4 h-4 text-purple-400" />} label="Costruttore" value={manufacturerName} />
                                )}
                            </CardContent>
                        </Card>

                        {specsText && (
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-primary" /> Specifiche Tecniche
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{specsText}</p></CardContent>
                            </Card>
                        )}

                        {machine.notes && (
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" /> Note
                                    </CardTitle>
                                </CardHeader>
                                <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{machine.notes}</p></CardContent>
                            </Card>
                        )}
                    </div>

                    {/* QR Code */}
                    <div>
                        <Card className="bg-card border-border sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-primary" /> QR Code
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-center">
                                    <QRCodeGenerator value={qrValue} size={200} />
                                </div>

                                <div className="space-y-2">
                                    {!editingQR ? (
                                        <>
                                            <p className="text-xs text-muted-foreground">URL codificato:</p>
                                            <p className="text-sm text-foreground font-mono break-all bg-muted/50 rounded-lg p-2">
                                                {machine.qr_code_token || <span className="text-muted-foreground italic">Default: link alla scheda</span>}
                                            </p>
                                            {canEdit && (
                                                <Button variant="outline" size="sm" onClick={() => { setEditingQR(true); setQrUrlDraft(machine.qr_code_token || ""); }} className="w-full mt-2">
                                                    <Pencil className="w-3 h-3 mr-2" />
                                                    {machine.qr_code_token ? "Modifica URL" : "Imposta URL personalizzato"}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-muted-foreground">Inserisci l'URL da codificare nel QR:</p>
                                            <Input value={qrUrlDraft} onChange={(e) => setQrUrlDraft(e.target.value)}
                                                placeholder="https://esempio.com/manuale.pdf"
                                                className="bg-muted border-border text-foreground text-sm" />
                                            <p className="text-xs text-muted-foreground">Lascia vuoto per usare il link alla scheda</p>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={handleSaveQR} disabled={savingQR} className="flex-1 bg-green-600 hover:bg-green-700">
                                                    <Save className="w-3 h-3 mr-1" />{savingQR ? "..." : "Salva"}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => { setEditingQR(false); setQrUrlDraft(machine.qr_code_token || ""); }}>
                                                    <X className="w-3 h-3 mr-1" /> Annulla
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function InfoRow({ icon, label, value, fallback = "\u2014" }: { icon: React.ReactNode; label: string; value: string | null | undefined; fallback?: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-muted-foreground w-36 shrink-0">{label}</span>
            <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>{value || fallback}</span>
        </div>
    );
}
