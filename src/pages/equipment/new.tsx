// src/pages/equipment/new.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    ArrowLeft,
    Save,
    Factory,
    Building2,
    Wrench,
    Layers3,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

interface PlantRow {
    id: string;
    name: string | null;
    code: string | null;
}

interface ProductionLineRow {
    id: string;
    name: string | null;
    code: string | null;
    plant_id: string | null;
}

function CardShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`rounded-[20px] border border-white/10 bg-[#1b2b45] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] ${className}`}
        >
            {children}
        </div>
    );
}

export default function NewEquipmentPage() {
    const router = useRouter();

    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < OrgType | null > (null);

    const [plants, setPlants] = useState < PlantRow[] > ([]);
    const [lines, setLines] = useState < ProductionLineRow[] > ([]);

    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [internalCode, setInternalCode] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [model, setModel] = useState("");
    const [brand, setBrand] = useState("");
    const [notes, setNotes] = useState("");
    const [plantId, setPlantId] = useState("");
    const [productionLineId, setProductionLineId] = useState("");
    const [lifecycleState, setLifecycleState] = useState("active");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx?.orgId || !ctx?.orgType) return;

                setUserRole(ctx.role ?? "technician");
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType as OrgType);

                if (ctx.orgType === "customer") {
                    const [plantsRes, linesRes] = await Promise.all([
                        supabase
                            .from("plants")
                            .select("id, name, code")
                            .eq("organization_id", ctx.orgId)
                            .eq("is_archived", false)
                            .order("name", { ascending: true }),
                        supabase
                            .from("production_lines")
                            .select("id, name, code, plant_id")
                            .eq("organization_id", ctx.orgId)
                            .eq("is_archived", false)
                            .order("name", { ascending: true }),
                    ]);

                    if (plantsRes.error) throw plantsRes.error;
                    if (linesRes.error) throw linesRes.error;

                    setPlants((plantsRes.data ?? []) as PlantRow[]);
                    setLines((linesRes.data ?? []) as ProductionLineRow[]);
                }
            } catch (error) {
                console.error("Equipment new load error:", error);
            }
        };

        load();
    }, []);

    const filteredLines = useMemo(() => {
        if (!plantId) return lines;
        return lines.filter((line) => line.plant_id === plantId);
    }, [lines, plantId]);

    const pageTitle =
        orgType === "manufacturer" ? "Nuova Macchina Costruttore" : "Nuova Macchina";

    const pageSubtitle =
        orgType === "manufacturer"
            ? "Crea una nuova macchina nel catalogo del costruttore attivo."
            : "Crea una nuova macchina e collegala a stabilimento e linea del cliente finale.";

    const canSave = !!orgId && !!name.trim();

    const handleSave = async () => {
        if (!orgId || !name.trim()) return;

        setSaving(true);
        try {
            const payload: Record<string, any> = {
                organization_id: orgId,
                name: name.trim(),
                internal_code: internalCode.trim() || null,
                serial_number: serialNumber.trim() || null,
                model: model.trim() || null,
                brand: brand.trim() || null,
                notes: notes.trim() || null,
                lifecycle_state: lifecycleState || "active",
                is_archived: false,
            };

            if (orgType === "customer") {
                payload.plant_id = plantId || null;
                payload.production_line_id = productionLineId || null;
            } else {
                payload.plant_id = null;
                payload.production_line_id = null;
            }

            const { data, error } = await supabase
                .from("machines")
                .insert(payload)
                .select("id")
                .single();

            if (error) throw error;

            router.push(`/equipment/${(data as any).id}`);
        } catch (error) {
            console.error("Equipment save error:", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={`${pageTitle} - MACHINA`} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1100px] space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-2">
                                <button
                                    onClick={() => router.push("/equipment")}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Torna a Macchine
                                </button>

                                <h1 className="text-4xl font-bold tracking-tight text-white">{pageTitle}</h1>
                                <p className="text-base text-slate-300">{pageSubtitle}</p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? "Salvataggio..." : "Salva Macchina"}
                            </button>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <CardShell className="p-6 xl:col-span-2">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">Dati macchina</div>
                                        <div className="text-sm text-slate-300">
                                            Compila i dati principali della macchina.
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-200">Nome macchina *</label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Es. Trituratore TSS 180"
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-200">Codice interno</label>
                                        <input
                                            value={internalCode}
                                            onChange={(e) => setInternalCode(e.target.value)}
                                            placeholder="Es. MCH-001"
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-200">Matricola</label>
                                        <input
                                            value={serialNumber}
                                            onChange={(e) => setSerialNumber(e.target.value)}
                                            placeholder="Es. SN-2026-001"
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-200">Marca</label>
                                        <input
                                            value={brand}
                                            onChange={(e) => setBrand(e.target.value)}
                                            placeholder="Es. ITR / OMAR"
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-200">Modello</label>
                                        <input
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            placeholder="Es. TSS 180"
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-200">Stato lifecycle</label>
                                        <select
                                            value={lifecycleState}
                                            onChange={(e) => setLifecycleState(e.target.value)}
                                            className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none"
                                        >
                                            <option value="active">Attiva</option>
                                            <option value="commissioning">Commissioning</option>
                                            <option value="maintenance">In manutenzione</option>
                                            <option value="inactive">Inattiva</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-200">Note</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={4}
                                            placeholder="Note tecniche, configurazione, dettagli aggiuntivi..."
                                            className="w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 py-3 text-white outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </CardShell>

                            <div className="space-y-6">
                                <CardShell className="p-6">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${orgType === "manufacturer"
                                                    ? "bg-orange-500/20 text-orange-300"
                                                    : "bg-blue-500/20 text-blue-300"
                                                }`}
                                        >
                                            {orgType === "manufacturer" ? (
                                                <Factory className="h-5 w-5" />
                                            ) : (
                                                <Building2 className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-white">Contesto</div>
                                            <div className="text-sm text-slate-300">
                                                {orgType === "manufacturer"
                                                    ? "Creazione macchina lato costruttore"
                                                    : "Creazione macchina lato cliente finale"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-slate-900/35 p-4 text-sm text-slate-300">
                                        {orgType === "manufacturer"
                                            ? "La macchina sarà creata nel catalogo del costruttore. Potrà essere assegnata successivamente a un cliente finale."
                                            : "La macchina sarà creata come macchina propria del cliente finale e potrà essere collegata a stabilimento e linea."}
                                    </div>
                                </CardShell>

                                {orgType === "customer" && (
                                    <CardShell className="p-6">
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                                                <Layers3 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-white">Collocazione</div>
                                                <div className="text-sm text-slate-300">
                                                    Collega la macchina al contesto produttivo.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-200">Stabilimento</label>
                                                <select
                                                    value={plantId}
                                                    onChange={(e) => {
                                                        setPlantId(e.target.value);
                                                        setProductionLineId("");
                                                    }}
                                                    className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none"
                                                >
                                                    <option value="">Nessuno</option>
                                                    {plants.map((plant) => (
                                                        <option key={plant.id} value={plant.id}>
                                                            {plant.name ?? plant.code ?? "Stabilimento"}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-200">Linea</label>
                                                <select
                                                    value={productionLineId}
                                                    onChange={(e) => setProductionLineId(e.target.value)}
                                                    className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none"
                                                >
                                                    <option value="">Nessuna</option>
                                                    {filteredLines.map((line) => (
                                                        <option key={line.id} value={line.id}>
                                                            {line.name ?? line.code ?? "Linea"}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </CardShell>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
