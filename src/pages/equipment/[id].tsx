import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import {
    ArrowLeft, Wrench, Building2, MapPin, Calendar, Hash, Tag,
    QrCode, FileText, ClipboardList, Pencil, Save, X,
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
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Attivo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    commissioned: { label: "Attivo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    inactive: { label: "Inattivo", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    under_maintenance: { label: "In Manutenzione", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    decommissioned: { label: "Dismesso", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    retired: { label: "Dismesso", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { id } = router.query;

    const [machine, setMachine] = useState < Machine | null > (null);
    const [plantName, setPlantName] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [editingQR, setEditingQR] = useState(false);
    const [qrUrlDraft, setQrUrlDraft] = useState("");
    const [savingQR, setSavingQR] = useState(false);

    useEffect(() => {
        if (id) loadAll(id as string);
    }, [id]);

    async function loadAll(machineId: string) {
        try {
            const ctx = await getUserContext();
            if (ctx) setUserRole(ctx.role);

            const { data, error } = await supabase.from("machines").select("*").eq("id", machineId).single();
            if (error) throw error;
            setMachine(data);
            setQrUrlDraft(data.qr_code_token || "");

            if (data.plant_id) {
                const { data: plant } = await supabase.from("plants").select("name").eq("id", data.plant_id).single();
                if (plant) setPlantName(plant.name);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    const isAdmin = userRole === "admin" || userRole === "supervisor";

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
                <p className="text-red-400 text-lg">Attrezzatura non trovata</p>
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
                    </div>
                    {isAdmin && (
                        <Button onClick={() => router.push(`/equipment/edit/${machine.id}`)} className="bg-blue-600 hover:bg-blue-700">
                            <Pencil className="mr-2 h-4 w-4" /> Modifica
                        </Button>
                    )}
                </div>

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
                            </CardContent>
                        </Card>

                        {/* Specifiche */}
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

                        {/* Note */}
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
                                            {isAdmin && (
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

