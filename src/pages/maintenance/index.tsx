import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
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
  return <div className={`surface-panel ${className}`}>{children}</div>;
}

function normalizePriority(value: string | null | undefined) {
  const v = (value || "").toLowerCase();
  if (v.includes("alta") || v === "high") return "high";
  if (v.includes("media") || v === "medium") return "medium";
  return "low";
}

function priorityStyles(
  priority: string | null | undefined,
  t: (key: string) => string
) {
  const normalized = normalizePriority(priority);

  if (normalized === "high") {
    return {
      iconWrap: "bg-red-500/15 text-red-600 dark:text-red-300",
      badge: "bg-red-500/15 text-red-700 dark:text-red-300",
      label: t("maintenance.priority.high"),
    };
  }

  if (normalized === "medium") {
    return {
      iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      label: t("maintenance.priority.medium"),
    };
  }

  return {
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: t("maintenance.priority.low"),
  };
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(locale);
  } catch {
    return value;
  }
}

export default function MaintenancePage() {
  const { t, language } = useLanguage();

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

      const normalized = normalizePriority(item.priority);

      const matchesPriority =
        priorityFilter === "all" || normalized === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [items, search, priorityFilter]);

  const locale =
    language === "it"
      ? "it-IT"
      : language === "fr"
      ? "fr-FR"
      : language === "es"
      ? "es-ES"
      : "en-GB";

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole}>
        <SEO title={`${t("maintenance.title")} - MACHINA`} />

        <div className="px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  {t("maintenance.title")}
                </h1>
                <p className="text-base text-muted-foreground">
                  {t("maintenance.subtitle")}
                </p>
              </div>

              <Link
                href="/maintenance/new"
                className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-muted shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]"
              >
                <CalendarDays className="h-5 w-5" />
                {t("maintenance.newPlan")}
              </Link>
            </div>

            <div className="w-full max-w-[600px] rounded-2xl border border-border bg-card p-1 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.28)]">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className="rounded-2xl bg-muted px-4 py-2.5 font-semibold text-foreground"
                >
                  {t("maintenance.tab.plans")}
                </button>
                <button
                  type="button"
                  className="rounded-2xl px-4 py-2.5 font-semibold text-muted-foreground"
                >
                  {t("maintenance.tab.workOrders")}
                </button>
              </div>
            </div>

            <CardShell className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("maintenance.searchPlaceholder")}
                    className="surface-input h-12 w-full pl-12 pr-4 outline-none"
                  />
                </div>

                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-foreground xl:w-[180px]">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-transparent outline-none"
                  >
                    <option value="all">{t("common.all")}</option>
                    <option value="high">{t("maintenance.priority.high")}</option>
                    <option value="medium">{t("maintenance.priority.medium")}</option>
                    <option value="low">{t("maintenance.priority.low")}</option>
                  </select>
                </div>
              </div>
            </CardShell>

            <div className="space-y-4">
              {loading ? (
                <CardShell className="p-6 text-muted-foreground">
                  {t("maintenance.loading")}
                </CardShell>
              ) : filteredItems.length === 0 ? (
                <CardShell className="p-6 text-muted-foreground">
                  {t("maintenance.noPlans")}
                </CardShell>
              ) : (
                filteredItems.map((item) => {
                  const style = priorityStyles(item.priority, t);

                  return (
                    <Link
                      key={item.id}
                      href={`/maintenance/${item.id}`}
                      className="block"
                      aria-label={item.title ?? t("maintenance.planFallback")}
                    >
                      <CardShell className="p-5 transition hover:-translate-y-0.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}
                            >
                              <CalendarDays className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-2xl font-bold text-foreground">
                                {item.title ?? t("maintenance.planFallback")}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <Wrench className="h-4 w-4" />
                                  {item.machine_name ?? t("maintenance.machineFallback")}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarDays className="h-4 w-4" />
                                  {formatDate(item.next_due_date, locale)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 className="h-4 w-4" />
                                  {item.frequency_label ?? "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-6">
                            <div
                              className={`rounded-full px-4 py-1.5 text-lg font-semibold ${style.badge}`}
                            >
                              {style.label}
                            </div>
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
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