import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { getUserContext } from "@/lib/supabaseHelpers";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Wrench,
  Users,
  ArrowRight,
  Factory,
  FileText,
  ClipboardList,
  CheckSquare,
  Package,
  Building2,
} from "lucide-react";

type OrgType = "manufacturer" | "customer" | null;

interface DashboardStats {
  machines: number;
  documents: number;
  workOrders: number;
  checklistTemplates: number;
  customers: number;
  assignedMachines: number;
  customerAccounts: number;
}

interface RecentMachine {
  id: string;
  name: string | null;
  serial_number: string | null;
  lifecycle_state: string | null;
}

interface RecentCustomer {
  id: string;
  name: string | null;
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
      className={`rounded-[22px] border border-border bg-card text-card-foreground shadow-[0_18px_32px_-24px_rgba(15,23,42,0.24),0_1px_0_rgba(15,23,42,0.08)] dark:shadow-[0_20px_40px_-28px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();

  const [orgType, setOrgType] = useState<OrgType>(null);
  const [userRole, setUserRole] = useState<string>("technician");
  const [stats, setStats] = useState<DashboardStats>({
    machines: 0,
    documents: 0,
    workOrders: 0,
    checklistTemplates: 0,
    customers: 0,
    assignedMachines: 0,
    customerAccounts: 0,
  });
  const [recentMachines, setRecentMachines] = useState<RecentMachine[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx?.orgId || !ctx?.orgType) return;

        setOrgType(ctx.orgType as OrgType);
        setUserRole(ctx.role ?? "technician");

        const [machinesRes, documentsRes, workOrdersRes, checklistRes] =
          await Promise.all([
            supabase
              .from("machines")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", ctx.orgId),
            supabase
              .from("documents")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", ctx.orgId)
              .eq("is_archived", false),
            supabase
              .from("work_orders")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", ctx.orgId),
            supabase
              .from("checklist_templates")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", ctx.orgId),
          ]);

        const nextStats: DashboardStats = {
          machines: machinesRes.count || 0,
          documents: documentsRes.count || 0,
          workOrders: workOrdersRes.count || 0,
          checklistTemplates: checklistRes.count || 0,
          customers: 0,
          assignedMachines: 0,
          customerAccounts: 0,
        };

        if (ctx.orgType === "manufacturer") {
          const customersList = await supabase
            .from("organizations")
            .select("id")
            .eq("manufacturer_org_id", ctx.orgId)
            .eq("type", "customer");

          const customerIds = customersList.data?.map((x: any) => x.id) ?? [];

          const [customersRes, assignmentsRes, customerAccountsRes, rc] =
            await Promise.all([
              supabase
                .from("organizations")
                .select("*", { count: "exact", head: true })
                .eq("manufacturer_org_id", ctx.orgId)
                .eq("type", "customer"),
              supabase
                .from("machine_assignments")
                .select("*", { count: "exact", head: true })
                .eq("manufacturer_org_id", ctx.orgId)
                .eq("is_active", true),
              customerIds.length > 0
                ? supabase
                    .from("organization_memberships")
                    .select("organization_id", { count: "exact", head: true })
                    .in("organization_id", customerIds)
                : Promise.resolve({ count: 0 } as any),
              supabase
                .from("organizations")
                .select("id, name")
                .eq("manufacturer_org_id", ctx.orgId)
                .eq("type", "customer")
                .order("created_at", { ascending: false })
                .limit(4),
            ]);

          nextStats.customers = customersRes.count || 0;
          nextStats.assignedMachines = assignmentsRes.count || 0;
          nextStats.customerAccounts = customerAccountsRes.count || 0;
          setRecentCustomers((rc.data ?? []) as RecentCustomer[]);
        }

        const { data: rm } = await supabase
          .from("machines")
          .select("id, name, serial_number, lifecycle_state")
          .eq("organization_id", ctx.orgId)
          .order("created_at", { ascending: false })
          .limit(4);

        setRecentMachines((rm ?? []) as RecentMachine[]);
        setStats(nextStats);
      } catch (error) {
        console.error("Dashboard load error:", error);
      }
    };

    load();
  }, []);

  const kpis = useMemo(() => {
    if (orgType === "manufacturer") {
      return [
        {
          title: t("dashboard.kpi.machinesProduced"),
          value: stats.machines,
          icon: Wrench,
          accent: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
        },
        {
          title: t("dashboard.kpi.customers"),
          value: stats.customers,
          icon: Building2,
          accent: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
        },
        {
          title: t("dashboard.kpi.assignedMachines"),
          value: stats.assignedMachines,
          icon: Package,
          accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        },
        {
          title: t("dashboard.kpi.customerAccounts"),
          value: stats.customerAccounts,
          icon: Users,
          accent: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
        },
      ];
    }

    return [
      {
        title: t("dashboard.kpi.machines"),
        value: stats.machines,
        icon: Factory,
        accent: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
      },
      {
        title: t("dashboard.kpi.documents"),
        value: stats.documents,
        icon: FileText,
        accent: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
      },
      {
        title: t("dashboard.kpi.workOrders"),
        value: stats.workOrders,
        icon: ClipboardList,
        accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
      },
      {
        title: t("dashboard.kpi.checklists"),
        value: stats.checklistTemplates,
        icon: CheckSquare,
        accent: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      },
    ];
  }, [orgType, stats, t]);

  const quickActions = useMemo(() => {
    if (orgType === "manufacturer") {
      return [
        {
          href: "/equipment/new",
          title: t("dashboard.action.newMachine"),
          subtitle: t("dashboard.action.addToCatalog"),
          accent: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
          icon: Wrench,
        },
        {
          href: "/customers",
          title: t("dashboard.action.newCustomer"),
          subtitle: t("dashboard.action.createCustomerOrg"),
          accent: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
          icon: Users,
        },
        {
          href: "/assignments",
          title: t("dashboard.action.assignMachines"),
          subtitle: t("dashboard.action.linkMachinesToCustomers"),
          accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
          icon: Package,
        },
      ];
    }

    return [
      {
        href: "/equipment/new",
        title: t("dashboard.action.newMachine"),
        subtitle: t("dashboard.action.addMachine"),
        accent: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
        icon: Wrench,
      },
      {
        href: "/documents",
        title: t("dashboard.action.documents"),
        subtitle: t("dashboard.action.openDocumentArchive"),
        accent: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
        icon: FileText,
      },
      {
        href: "/work-orders/create",
        title: t("dashboard.action.newWorkOrder"),
        subtitle: t("dashboard.action.planOperationalActivities"),
        accent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        icon: ClipboardList,
      },
    ];
  }, [orgType, t]);

  return (
    <OrgContextGuard>
      <MainLayout userRole={userRole}>
        <SEO title="Dashboard - MACHINA" />

        <div className="px-5 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1220px] space-y-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                {t("dashboard.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {orgType === "manufacturer"
                  ? t("dashboard.subtitleManufacturer")
                  : t("dashboard.subtitleCustomer")}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((item) => {
                const Icon = item.icon;
                return (
                  <CardShell key={item.title} className="p-6">
                    <div
                      className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-5xl font-bold leading-none text-foreground">
                      {item.value}
                    </div>
                    <div className="mt-2 text-[22px] font-medium text-foreground/78">
                      {item.title}
                    </div>
                  </CardShell>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="block">
                    <CardShell className="flex items-center justify-between gap-4 p-6 transition hover:-translate-y-0.5">
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.accent}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[18px] font-bold text-foreground">
                            {action.title}
                          </div>
                          <div className="truncate text-sm text-muted-foreground">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </CardShell>
                  </Link>
                );
              })}
            </div>

            {orgType === "manufacturer" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-[32px] font-bold text-foreground">
                    {t("dashboard.recentCustomers")}
                  </h2>
                  <Link
                    href="/customers"
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                  >
                    {t("common.viewAll")}
                  </Link>
                </div>

                {recentCustomers.length === 0 ? (
                  <CardShell className="p-6 text-muted-foreground">
                    {t("dashboard.noRecentCustomers")}
                  </CardShell>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {recentCustomers.map((customer) => (
                      <Link key={customer.id} href="/customers" className="block">
                        <CardShell className="p-5 transition hover:-translate-y-0.5">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
                              <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xl font-semibold text-foreground">
                                {customer.name ?? t("dashboard.customerFallback")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {t("dashboard.customerLabel")}
                              </div>
                            </div>
                          </div>
                        </CardShell>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[32px] font-bold text-foreground">
                  {t("dashboard.recentMachines")}
                </h2>
                <Link
                  href="/equipment"
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                >
                  {t("common.viewAll")}
                </Link>
              </div>

              {recentMachines.length === 0 ? (
                <CardShell className="p-6 text-muted-foreground">
                  {t("dashboard.noRecentMachines")}
                </CardShell>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {recentMachines.map((machine) => (
                    <Link key={machine.id} href={`/equipment/${machine.id}`} className="block">
                      <CardShell className="p-5 transition hover:-translate-y-0.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-xl font-semibold text-foreground">
                              {machine.name ?? t("dashboard.machineFallback")}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {machine.serial_number ?? "—"}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </div>
                        {machine.lifecycle_state && (
                          <div className="mt-4 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground/80">
                            {machine.lifecycle_state}
                          </div>
                        )}
                      </CardShell>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </MainLayout>
    </OrgContextGuard>
  );
}