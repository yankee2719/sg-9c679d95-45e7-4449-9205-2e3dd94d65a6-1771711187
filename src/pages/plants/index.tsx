// src/pages/plants/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Building2, ArrowRight, Plus, GitBranch, Save, X } from "lucide-react";

interface PlantRow {
  id: string;
  name: string | null;
  code: string | null;
}

interface LineRow {
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
    <div className={`rounded-[20px] border border-white/10 bg-[#1b2b45] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] ${className}`}>
      {children}
    </div>
  );
}

export default function PlantsPage() {
  const [userRole, setUserRole] = useState("technician");
  const [orgId, setOrgId] = useState<string | null>(null);

  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [lines, setLines] = useState<LineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPlantForm, setShowPlantForm] = useState(false);
  const [showLineForm, setShowLineForm] = useState(false);
  const [savingPlant, setSavingPlant] = useState(false);
  const [savingLine, setSavingLine] = useState(false);

  const [plantName, setPlantName] = useState("");
  const [plantCode, setPlantCode] = useState("");
  const [lineName, setLineName] = useState("");
  const [lineCode, setLineCode] = useState("");
  const [linePlantId, setLinePlantId] = useState("");

  const canManage = userRole === "admin" || userRole === "supervisor";

  const loadData = async () => {
    try {
      const ctx = await getUserContext();
      if (!ctx?.orgId) return;

      setOrgId(ctx.orgId);
      setUserRole(ctx.role ?? "technician");

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
      setLines((linesRes.data ?? []) as LineRow[]);
    } catch (error) {
      console.error("Plants load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const linesByPlant = useMemo(() => {
    const map = new Map<string, LineRow[]>();
    for (const line of lines) {
      const key = line.plant_id ?? "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(line);
    }
    return map;
  }, [lines]);

  const handleCreatePlant = async () => {
    if (!orgId || !plantName.trim()) return;

    setSavingPlant(true);
    try {
      const { error } = await supabase.from("plants").insert({
        organization_id: orgId,
        name: plantName.trim(),
        code: plantCode.trim() || null,
        is_archived: false,
      });

      if (error) throw error;

      setPlantName("");
      setPlantCode("");
      setShowPlantForm(false);
      await loadData();
    } catch (error) {
      console.error("Create plant error:", error);
    } finally {
      setSavingPlant(false);
    }
  };

  const handleCreateLine = async () => {
    if (!orgId || !lineName.trim() || !linePlantId) return;

    setSavingLine(true);
    try {
      const { error } = await supabase.from("production_lines").insert({
        organization_id: orgId,
        plant_id: linePlantId,
        name: lineName.trim(),
        code: lineCode.trim() || null,
        is_archived: false,
      });

      if (error) throw error;

      setLineName("");
      setLineCode("");
      setLinePlantId("");
      setShowLineForm(false);
      await loadData();
    } catch (error) {
      console.error("Create production line error:", error);
    } finally {
      setSavingLine(false);
    }
  };

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole}>
        <SEO title="Stabilimenti - MACHINA" />

        <div className="px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px] space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-white">Stabilimenti</h1>
                <p className="text-base text-slate-300">
                  Gestisci stabilimenti e linee produttive del contesto attivo.
                </p>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setShowPlantForm((v) => !v);
                      setShowLineForm(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400"
                  >
                    <Plus className="h-4 w-4" />
                    Nuovo Stabilimento
                  </button>

                  <button
                    onClick={() => {
                      setShowLineForm((v) => !v);
                      setShowPlantForm(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#1b2b45] px-5 py-3 font-semibold text-white transition hover:bg-[#223451]"
                  >
                    <GitBranch className="h-4 w-4" />
                    Nuova Linea
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <CardShell className="p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-5xl font-bold leading-none text-white">{plants.length}</div>
                <div className="mt-2 text-[22px] font-medium text-slate-200">Stabilimenti Attivi</div>
              </CardShell>

              <CardShell className="p-6">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div className="text-5xl font-bold leading-none text-white">{lines.length}</div>
                <div className="mt-2 text-[22px] font-medium text-slate-200">Linee Attive</div>
              </CardShell>
            </div>

            {canManage && showPlantForm && (
              <CardShell className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">Nuovo Stabilimento</div>
                    <div className="text-sm text-slate-300">Crea uno stabilimento nel contesto attivo.</div>
                  </div>
                  <button
                    onClick={() => setShowPlantForm(false)}
                    className="rounded-2xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200">Nome stabilimento *</label>
                    <input
                      value={plantName}
                      onChange={(e) => setPlantName(e.target.value)}
                      placeholder="Es. Plant Test 01"
                      className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200">Codice</label>
                    <input
                      value={plantCode}
                      onChange={(e) => setPlantCode(e.target.value)}
                      placeholder="Es. PLT-01"
                      className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleCreatePlant}
                    disabled={!plantName.trim() || savingPlant}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingPlant ? "Salvataggio..." : "Salva Stabilimento"}
                  </button>
                </div>
              </CardShell>
            )}

            {canManage && showLineForm && (
              <CardShell className="p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-white">Nuova Linea</div>
                    <div className="text-sm text-slate-300">Crea una linea produttiva collegata a uno stabilimento.</div>
                  </div>
                  <button
                    onClick={() => setShowLineForm(false)}
                    className="rounded-2xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200">Stabilimento *</label>
                    <select
                      value={linePlantId}
                      onChange={(e) => setLinePlantId(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none"
                    >
                      <option value="">Seleziona</option>
                      {plants.map((plant) => (
                        <option key={plant.id} value={plant.id}>
                          {plant.name ?? plant.code ?? "Stabilimento"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200">Nome linea *</label>
                    <input
                      value={lineName}
                      onChange={(e) => setLineName(e.target.value)}
                      placeholder="Es. Linea Test 01"
                      className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-200">Codice</label>
                    <input
                      value={lineCode}
                      onChange={(e) => setLineCode(e.target.value)}
                      placeholder="Es. LN-01"
                      className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] px-4 text-white outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleCreateLine}
                    disabled={!lineName.trim() || !linePlantId || savingLine}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingLine ? "Salvataggio..." : "Salva Linea"}
                  </button>
                </div>
              </CardShell>
            )}

            <section className="space-y-4">
              <h2 className="text-[32px] font-bold text-white">Elenco Stabilimenti</h2>

              {loading ? (
                <CardShell className="p-6 text-slate-300">Caricamento stabilimenti...</CardShell>
              ) : plants.length === 0 ? (
                <CardShell className="p-6 text-slate-300">Nessuno stabilimento presente.</CardShell>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {plants.map((plant) => {
                    const plantLines = linesByPlant.get(plant.id) ?? [];

                    return (
                      <Link key={plant.id} href={`/plants/${plant.id}`} className="block">
                        <CardShell className="p-5 transition hover:translate-y-[-2px]">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-xl font-semibold text-white">
                                    {plant.name ?? "Stabilimento"}
                                  </div>
                                  <div className="text-sm text-slate-300">{plant.code ?? "—"}</div>
                                </div>
                              </div>
                              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                            </div>

                            <div className="rounded-2xl bg-slate-900/35 p-3">
                              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                                <GitBranch className="h-4 w-4 text-emerald-300" />
                                Linee collegate
                              </div>

                              {plantLines.length === 0 ? (
                                <div className="text-sm text-slate-400">Nessuna linea collegata</div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {plantLines.map((line) => (
                                    <span
                                      key={line.id}
                                      className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300"
                                    >
                                      {line.name ?? line.code ?? "Linea"}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardShell>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </MainLayout>
    </OrgContextGuard>
  );
}
