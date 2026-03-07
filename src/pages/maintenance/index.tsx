// src/pages/maintenance/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
  CalendarDays,
  Search,
  Filter,
  ChevronRight,
  Wrench,
  Clock3,
} from "lucide-react";

interface MaintenanceRow {
  id: string;
  title: string | null;
  machine_id: string | null;
  machine_name?: string | null;
  next_due_date?: string | null;
  frequency_label?: string | null;
  priority?: string | null;
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

function priorityStyles(priority: string | null | undefined) {
  const value = (priority || "").toLowerCase();
  if (value.includes("alta") || value === "high") {
    return {
      iconWrap: "bg-red-500/15 text-red-400",
      badge: "bg-red-500/15 text-red-300 border border-red-500/30",
      label: "Alta",
    };
  }
  if (value.includes("media") || value === "medium") {
    return {
      iconWrap: "bg-amber-500/15 text-amber-400",
      badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      label: "Media",
    };
  }
  return {
    iconWrap: "bg-emerald-500/15 text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    label: "Bassa",
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("it-IT");
  } catch {
    return value;
  }
}

export default function MaintenancePage() {
  const [userRole, setUserRole] = useState("technician");
  const [items, setItems] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx?.orgId) return;

        setUserRole(ctx.role ?? "technician");

        const { data: plans, error } = await supabase
          .from("maintenance_plans")
          .select("id, title, machine_id, next_due_date, frequency, priority")
          .eq("organization_id", ctx.orgId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const machineIds = (plans ?? []).map((x: any) => x.machine_id).filter(Boolean);
        const { data: machines } = machineIds.length
          ? await supabase.from("machines").select("id, name").in("id", machineIds)
          : ({ data: [] } as any);

        const machineMap = new Map((machines ?? []).map((m: any) => [m.id, m.name]));

        setItems(
          (plans ?? []).map((row: any) => ({
            id: row.id,
            title: row.title,
            machine_id: row.machine_id,
            machine_name: machineMap.get(row.machine_id) ?? null,
            next_due_date: row.next_due_date ?? null,
            frequency_label: row.frequency ?? null,
            priority: row.priority ?? null,
          }))
        );
      } catch (error) {
        console.error("Maintenance load error:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        (item.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (item.machine_name ?? "").toLowerCase().includes(search.toLowerCase());

      const normalized = (item.priority ?? "").toLowerCase();
      const matchesPriority =
        priorityFilter === "all" ||
        normalized === priorityFilter ||
        normalized.includes(priorityFilter);

      return matchesSearch && matchesPriority;
    });
  }, [items, search, priorityFilter]);

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole}>
        <SEO title="Manutenzione - MACHINA" />

        <div className="px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-white">Manutenzione</h1>
                <p className="text-base text-slate-300">
                  Gestisci e monitora tutte le manutenzioni
                </p>
              </div>

              <Link
                href="/maintenance/new"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1b2b45] px-5 py-3 font-semibold text-white transition hover:bg-[#223451]"
              >
                <CalendarDays className="h-5 w-5" />
                Nuovo Piano
              </Link>
            </div>

            <div className="w-full max-w-[520px] rounded-2xl bg-[#32466a] p-1">
              <div className="grid grid-cols-2 gap-1">
                <button className="rounded-2xl bg-[#07152f] px-4 py-2.5 font-semibold text-white">
                  Piani
                </button>
                <button className="rounded-2xl px-4 py-2.5 font-semibold text-slate-300">
                  Ordini di Lavoro
                </button>
              </div>
            </div>

            <CardShell className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca"
                    className="h-12 w-full rounded-2xl border border-blue-500/30 bg-[#07152f] pl-12 pr-4 text-white outline-none placeholder:text-slate-400"
                  />
                </div>

                <div className="flex h-12 items-center gap-3 rounded-2xl border border-blue-500/20 bg-[#07152f] px-4 text-white xl:w-[180px]">
                  <Filter className="h-5 w-5 text-slate-400" />
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  >
                    <option value="all" className="text-black">Tutti</option>
                    <option value="alta" className="text-black">Alta</option>
                    <option value="media" className="text-black">Media</option>
                    <option value="bassa" className="text-black">Bassa</option>
                  </select>
                </div>
              </div>
            </CardShell>

            <div className="space-y-4">
              {loading ? (
                <CardShell className="p-6 text-slate-300">Caricamento manutenzioni...</CardShell>
              ) : filteredItems.length === 0 ? (
                <CardShell className="p-6 text-slate-300">Nessun piano manutentivo trovato.</CardShell>
              ) : (
                filteredItems.map((item) => {
                  const style = priorityStyles(item.priority);

                  return (
                    <Link key={item.id} href={`/maintenance/${item.id}`} className="block" aria-label={item.title ?? "Piano manutenzione"}>
                      <CardShell className="p-5 transition hover:translate-y-[-2px]">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}>
                              <CalendarDays className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-2xl font-bold text-white">
                                {item.title ?? "Piano manutenzione"}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                  <Wrench className="h-4 w-4" />
                                  {item.machine_name ?? "Macchina"}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-4 w-4" />
                                  {formatDate(item.next_due_date)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 className="h-4 w-4" />
                                  {item.frequency_label ?? "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-6">
                            <div className={`rounded-full px-4 py-1.5 text-lg font-semibold ${style.badge}`}>
                              {style.label}
                            </div>
                            <ChevronRight className="h-6 w-6 text-slate-400" />
                          </div>
                        </div>
                      </CardShell>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </OrgContextGuard>
  );
}
