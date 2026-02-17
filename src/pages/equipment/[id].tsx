import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeGenerator } from "@/components/QRCodeGenerator";
import {
    ArrowLeft,
    Wrench,
    Building2,
    Factory,
    MapPin,
    Calendar,
    Hash,
    Tag,
    QrCode,
    FileText,
    ClipboardList,
    Pencil,
    Save,
    X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
    id: string;
    name: string;
    equipment_code: string;
    serial_number: string | null;
    manufacturer: string | null;
    model: string | null;
    category: string | null;
    status: string;
    location: string | null;
    purchase_date: string | null;
    technical_specs: string | null;
    notes: string | null;
    plant_id: string | null;
    department_id: string | null;
    qr_code_url: string | null;
    created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Attivo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    inactive: { label: "Inattivo", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    under_maintenance: { label: "In Manutenzione", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    retired: { label: "Dismesso", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const { id } = router.query;

    const [equipment, setEquipment] = useState < Equipment | null > (null);
    const [plantName, setPlantName] = useState < string | null > (null);
    const [departmentName, setDepartmentName] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");

    // QR editing
    const [editingQR, setEditingQR] = useState(false);
    const [qrUrlDraft, setQrUrlDraft] = useState("");
    const [savingQR, setSavingQR] = useState(false);

    useEffect(() => {
        if (id) loadEquipment(id as string);
        loadUserRole();
    }, [id]);

    async function loadUserRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
            if (profile) setUserRole(profile.role);
        }
    }

    async function loadEquipment(equipmentId: string) {
        try {
            const { data, error } = await supabase
                .from("equipment")
                .select("*")
                .eq("id", equipmentId)
                .single();

            if (error) throw error;
            setEquipment(data);
            setQrUrlDraft(data.qr_code_url || "");

            if (data.plant_id) {
                const { data: plant } = await supabase.from("plants").select("name").eq("id", data.plant_id).single();
                if (plant) setPlantName(plant.name);
            }

            if (data.department_id) {
                const { data: dept } = await supabase.from("departments").select("name").eq("id", data.department_id).single();
                if (dept) setDepartmentName(dept.name);
            }
        } catch (error) {
            console.error("Failed to load equipment:", error);
        } finally {
            setLoading(false);
        }
    }

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const handleSaveQR = async () => {
        if (!equipment) return;
        setSavingQR(true);
        try {
            const { error } = await supabase
                .from("equipment")
                .update({ qr_code_url: qrUrlDraft.trim() || null })
                .eq("id", equipment.id);

            if (error) throw error;

            setEquipment({ ...equipment, qr_code_url: qrUrlDraft.trim() || null });
            setEditingQR(false);
            toast({ title: "Salvato", description: "URL QR Code aggiornato" });
        } catch (error) {
            toast({ title: "Errore", description: "Impossibile salvare l'URL", variant: "destructive" });
        } finally {
            setSavingQR(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="container mx-auto py-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-muted rounded w-1/3" />
                        <div className="h-64 bg-muted rounded" />
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!equipment) {
        return (
            <MainLayout>
                <div className="container mx-auto py-6 text-center">
                    <p className="text-red-400 text-lg">Attrezzatura non trovata</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push("/equipment")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla lista
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const status = statusConfig[equipment.status] || statusConfig.active;
    const qrValue = equipment.qr_code_url || `${typeof window !== "undefined" ? window.location.origin : ""}/equipment/${equipment.id}`;

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
                            <h1 className="text-2xl font-bold text-foreground">{equipment.name}</h1>
                            <p className="text-sm text-muted-foreground">{equipment.equipment_code}</p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => router.push(`/equipment/edit/${equipment.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifica
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column: info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info principali */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <Wrench className="w-5 h-5 text-primary" />
                                    Informazioni Generali
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={equipment.equipment_code} />
                                <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={equipment.category} />
                                <InfoRow icon={<Wrench className="w-4 h-4" />} label="Produttore" value={equipment.manufacturer} />
                                <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={equipment.model} />
                                <InfoRow icon={<Hash className="w-4 h-4" />} label="N. Serie" value={equipment.serial_number} />
                                <InfoRow
                                    icon={<Calendar className="w-4 h-4" />}
                                    label="Data Acquisto"
                                    value={equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString("it-IT") : null}
                                />
                            </CardContent>
                        </Card>

                        {/* Ubicazione */}
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    Ubicazione
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Stabilimento" value={plantName} fallback="Non assegnato" />
                                <InfoRow icon={<Factory className="w-4 h-4 text-amber-400" />} label="Reparto" value={departmentName} fallback="Non assegnato" />
                                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Posizione" value={equipment.location} />
                            </CardContent>
                        </Card>

                        {/* Specifiche tecniche */}
                        {equipment.technical_specs && (
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <ClipboardList className="w-5 h-5 text-primary" />
                                        Specifiche Tecniche
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{equipment.technical_specs}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Note */}
                        {equipment.notes && (
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Note
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{equipment.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column: QR Code */}
                    <div>
                        <Card className="bg-card border-border sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-foreground flex items-center gap-2">
                                    <QrCode className="w-5 h-5 text-primary" />
                                    QR Code
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* QR Code display */}
                                <div className="flex justify-center">
                                    <QRCodeGenerator value={qrValue} size={200} />
                                </div>

                                {/* URL info */}
                                <div className="space-y-2">
                                    {!editingQR ? (
                                        <>
                                            <p className="text-xs text-muted-foreground">URL codificato:</p>
                                            <p className="text-sm text-foreground font-mono break-all bg-muted/50 rounded-lg p-2">
                                                {equipment.qr_code_url || (
                                                    <span className="text-muted-foreground italic">Default: link alla scheda</span>
                                                )}
                                            </p>
                                            {isAdmin && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setEditingQR(true); setQrUrlDraft(equipment.qr_code_url || ""); }}
                                                    className="w-full mt-2"
                                                >
                                                    <Pencil className="w-3 h-3 mr-2" />
                                                    {equipment.qr_code_url ? "Modifica URL" : "Imposta URL personalizzato"}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-muted-foreground">Inserisci l'URL da codificare nel QR:</p>
                                            <Input
                                                value={qrUrlDraft}
                                                onChange={(e) => setQrUrlDraft(e.target.value)}
                                                placeholder="https://esempio.com/manuale.pdf"
                                                className="bg-muted border-border text-foreground text-sm"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Lascia vuoto per usare il link alla scheda attrezzatura
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveQR}
                                                    disabled={savingQR}
                                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                                >
                                                    <Save className="w-3 h-3 mr-1" />
                                                    {savingQR ? "Salvataggio..." : "Salva"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => { setEditingQR(false); setQrUrlDraft(equipment.qr_code_url || ""); }}
                                                >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Annulla
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

function InfoRow({
    icon,
    label,
    value,
    fallback = "\u2014",
}: {
    icon: React.ReactNode;
    label: string;
    value: string | null | undefined;
    fallback?: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-muted-foreground w-32 shrink-0">{label}</span>
            <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
                {value || fallback}
            </span>
        </div>
    );
}