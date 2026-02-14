import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, QrCode, Wrench, Edit } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface Equipment {
    id: string;
    tenant_id: string;
    name: string;
    equipment_code: string;
    serial_number: string;
    manufacturer: string;
    model: string;
    status: string;
    location: string;
    category: string | null;
    image_url: string | null;
    qr_code: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    notes: string | null;
}

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    const [equipment, setEquipment] = useState < Equipment | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && typeof id === "string") {
            loadEquipment(id);
        }
    }, [id]);

    async function loadEquipment(equipmentId: string) {
        try {
            const { data, error } = await supabase
                .from("equipment")
                .select("*")
                .eq("id", equipmentId)
                .single();

            if (error) throw error;
            setEquipment(data);
        } catch (error) {
            console.error("Failed to load equipment:", error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusConfig = (status: string) => {
        const config: Record<string, { label: string; color: string }> = {
            active: {
                label: t("equipment.active"),
                color: "bg-green-500/20 text-green-400 border-green-500/30",
            },
            under_maintenance: {
                label: t("equipment.maintenance"),
                color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            },
            inactive: {
                label: t("equipment.inactive"),
                color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
            },
            decommissioned: {
                label: t("equipment.decommissioned"),
                color: "bg-red-500/20 text-red-400 border-red-500/30",
            },
        };
        return config[status] || config.active;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-pulse text-muted-foreground">
                        {t("common.loading")}...
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!equipment) {
        return (
            <MainLayout>
                <div className="text-center py-12">
                    <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {t("equipment.noEquipment")}
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push("/equipment")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t("common.back")}
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const statusConfig = getStatusConfig(equipment.status);

    return (
        <MainLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/equipment")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                {equipment.name}
                            </h1>
                            <p className="text-muted-foreground">
                                {equipment.equipment_code}
                                {equipment.serial_number &&
                                    ` • S/N: ${equipment.serial_number}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* FIX: Documents link */}
                        <Button
                            variant="outline"
                            onClick={() =>
                                router.push(`/equipment/${equipment.id}/documents`)
                            }
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            {t("nav.documents") || "Documenti"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                router.push(`/equipment/edit/${equipment.id}`)
                            }
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            {t("common.edit")}
                        </Button>
                    </div>
                </div>

                {/* Detail Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* General Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("equipment.details") || "Dettagli"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">
                                    {t("common.status")}
                                </span>
                                <Badge className={statusConfig.color}>
                                    {statusConfig.label}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">
                                    {t("equipment.manufacturer") || "Produttore"}
                                </span>
                                <span className="text-foreground font-medium">
                                    {equipment.manufacturer || "-"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">
                                    {t("equipment.model") || "Modello"}
                                </span>
                                <span className="text-foreground font-medium">
                                    {equipment.model || "-"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-border pb-2">
                                <span className="text-muted-foreground">
                                    {t("equipment.location") || "Ubicazione"}
                                </span>
                                <span className="text-foreground font-medium">
                                    {equipment.location || "-"}
                                </span>
                            </div>
                            {equipment.category && (
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-muted-foreground">
                                        {t("equipment.category") || "Categoria"}
                                    </span>
                                    <span className="text-foreground font-medium">
                                        {equipment.category}
                                    </span>
                                </div>
                            )}
                            {equipment.purchase_date && (
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-muted-foreground">
                                        Data acquisto
                                    </span>
                                    <span className="text-foreground font-medium">
                                        {new Date(equipment.purchase_date).toLocaleDateString(
                                            "it-IT"
                                        )}
                                    </span>
                                </div>
                            )}
                            {equipment.warranty_expiry && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">
                                        Scadenza garanzia
                                    </span>
                                    <span className="text-foreground font-medium">
                                        {new Date(
                                            equipment.warranty_expiry
                                        ).toLocaleDateString("it-IT")}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* QR Code & Notes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>QR Code & Note</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {equipment.qr_code ? (
                                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                    <QrCode className="w-8 h-8 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Codice QR
                                        </p>
                                        <p className="font-mono text-foreground">
                                            {equipment.qr_code}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-dashed border-border">
                                    <QrCode className="w-8 h-8 text-muted-foreground" />
                                    <p className="text-muted-foreground text-sm">
                                        Nessun codice QR assegnato
                                    </p>
                                </div>
                            )}

                            {equipment.notes && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Note</p>
                                    <p className="text-foreground whitespace-pre-wrap">
                                        {equipment.notes}
                                    </p>
                                </div>
                            )}

                            {equipment.image_url && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Immagine
                                    </p>
                                    <img
                                        src={equipment.image_url}
                                        alt={equipment.name}
                                        className="rounded-lg max-h-48 object-cover w-full"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() =>
                                    router.push(`/equipment/${equipment.id}/documents`)
                                }
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Gestione Documenti
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.push(
                                        `/maintenance/new?equipment_id=${equipment.id}`
                                    )
                                }
                            >
                                <Wrench className="h-4 w-4 mr-2" />
                                Nuova Manutenzione
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
