import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { id } = router.query;

  const [equipment, setEquipment] = useState < Equipment | null > (null);
  const [plantName, setPlantName] = useState < string | null > (null);
  const [departmentName, setDepartmentName] = useState < string | null > (null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (id) loadEquipment(id as string);
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

      // Load plant name
      if (data.plant_id) {
        const { data: plant } = await supabase
          .from("plants")
          .select("name")
          .eq("id", data.plant_id)
          .single();
        if (plant) setPlantName(plant.name);
      }

      // Load department name
      if (data.department_id) {
        const { data: dept } = await supabase
          .from("departments")
          .select("name")
          .eq("id", data.department_id)
          .single();
        if (dept) setDepartmentName(dept.name);
      }
    } catch (error) {
      console.error("Failed to load equipment:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3" />
            <div className="h-64 bg-slate-700 rounded" />
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
  const qrValue = `${typeof window !== "undefined" ? window.location.origin : ""}/equipment/${equipment.id}`;

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
              <h1 className="text-2xl font-bold text-white">{equipment.name}</h1>
              <p className="text-sm text-slate-400">{equipment.equipment_code}</p>
            </div>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQR(!showQR)}
              className="border-slate-600"
            >
              <QrCode className="mr-2 h-4 w-4" />
              {showQR ? "Nascondi QR" : "Mostra QR"}
            </Button>
            <Button
              onClick={() => router.push(`/equipment/edit/${equipment.id}`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifica
            </Button>
          </div>
        </div>

        {/* QR Code */}
        {showQR && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                QR Code Attrezzatura
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QRCodeGenerator value={qrValue} allowCustomLink />
              <p className="text-sm text-slate-400 text-center">
                Scansiona per accedere alla scheda di <strong className="text-white">{equipment.name}</strong>
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info principali */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Informazioni Generali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={<Hash className="w-4 h-4" />} label="Codice" value={equipment.equipment_code} />
              <InfoRow icon={<Tag className="w-4 h-4" />} label="Categoria" value={equipment.category} />
              <InfoRow icon={<Wrench className="w-4 h-4" />} label="Produttore" value={equipment.manufacturer} />
              <InfoRow icon={<FileText className="w-4 h-4" />} label="Modello" value={equipment.model} />
              <InfoRow icon={<Hash className="w-4 h-4" />} label="Numero di Serie" value={equipment.serial_number} />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Data Acquisto"
                value={equipment.purchase_date ? new Date(equipment.purchase_date).toLocaleDateString("it-IT") : null}
              />
            </CardContent>
          </Card>

          {/* Ubicazione */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Ubicazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<Building2 className="w-4 h-4 text-blue-400" />}
                label="Stabilimento"
                value={plantName}
                fallback="Non assegnato"
              />
              <InfoRow
                icon={<Factory className="w-4 h-4 text-amber-400" />}
                label="Reparto"
                value={departmentName}
                fallback="Non assegnato"
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Posizione"
                value={equipment.location}
              />
            </CardContent>
          </Card>
        </div>

        {/* Specifiche tecniche */}
        {equipment.technical_specs && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Specifiche Tecniche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 whitespace-pre-wrap">{equipment.technical_specs}</p>
            </CardContent>
          </Card>
        )}

        {/* Note */}
        {equipment.notes && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 whitespace-pre-wrap">{equipment.notes}</p>
            </CardContent>
          </Card>
        )}
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
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-400 w-36 shrink-0">{label}</span>
      <span className={value ? "text-white font-medium" : "text-slate-500"}>
        {value || fallback}
      </span>
    </div>
  );
}
