// src/pages/assignments/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Search,
  Package,
  Building2,
  ChevronDown,
  ChevronRight,
  Wrench,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

type OrgType = "manufacturer" | "customer";

type CustomerOrg = {
  id: string;
  name: string;
};

type AssignedMachine = {
  id: string;
  name: string;
  internal_code: string | null;
  serial_number: string | null;
  category: string | null;
  lifecycle_state: string | null;
  photo_url: string | null;
  qr_code_token: string | null;
  organization_id: string | null;
};

type AssignmentRow = {
  id?: string;
  machine_id: string;
  customer_org_id: string;
  assigned_at: string | null;
  machines?: AssignedMachine | null; // nested join (if FK exists)
};

async function getOrgTypeById(orgId: string): Promise<OrgType | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .maybeSingle();

  if (error) throw error;

  const t = String((data as any)?.type ?? "").toLowerCase();
  if (t === "manufacturer") return "manufacturer";
  if (t === "customer") return "customer";
  return null;
}

function statusBadge(state: string | null) {
  const s = (state ?? "active").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Attivo",
      cls: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    },
    commissioned: {
      label: "Attivo",
      cls: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30",
    },
    under_maintenance: {
      label: "Manutenzione",
      cls: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30",
    },
    inactive: {
      label: "Inattivo",
      cls: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
    },
    decommissioned: {
      label: "Dismesso",
      cls: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
    },
  };

  return (
    map[s] ?? {
      label: state ?? "—",
      cls: "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30",
    }
  );
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<UserContext | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<OrgType | null>(null);

  const [customers, setCustomers] = useState<CustomerOrg[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // --------------------------
  // LOAD
  // --------------------------
  const loadAll = async () => {
    setLoading(true);
    try {
      const userCtx: any = await getUserContext();
      if (!userCtx) {
        router.push("/login");
        return;
      }
      setCtx(userCtx);

      const effectiveOrgId =
        userCtx.orgId || userCtx.organizationId || userCtx.organization_id || userCtx.tenant_id || null;

      if (!effectiveOrgId) throw new Error("Organization non trovata nel contesto utente.");
      setOrgId(effectiveOrgId);

      // ✅ DB TRUTH, sempre
      const resolvedType = await getOrgTypeById(effectiveOrgId);
      if (!resolvedType) throw new Error("orgType non risolto - RLS o organizations.type errato");
      setOrgType(resolvedType);

      // Questa pagina serve al costruttore
      if (resolvedType !== "manufacturer") {
        toast({
          title: "Accesso non valido",
          description: "La pagina Assegnazioni è disponibile per l’organizzazione Costruttore.",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      // 1) clienti del costruttore
      const { data: custData, error: custErr } = await supabase
        .from("organizations")
        .select("id,name")
        .eq("manufacturer_org_id", effectiveOrgId)
        .eq("type", "customer")
        .order("name", { ascending: true });

      if (custErr) throw custErr;
      const custs = (custData ?? []) as any as CustomerOrg[];
      setCustomers(custs);

      // 2) assegnazioni attive del costruttore (con join macchine se FK presente)
      // NB: se il join "machines(...)" fallisce perché non hai la relazione FK, sotto c'è fallback automatico.
      let asg: AssignmentRow[] = [];
      const { data: asgData, error: asgErr } = await supabase
        .from("machine_assignments")
        .select(
          `
          machine_id,
          customer_org_id,
          assigned_at,
          machines:machines (
            id, name, internal_code, serial_number, category, lifecycle_state, photo_url, qr_code_token, organization_id
          )
        `
        )
        .eq("manufacturer_org_id", effectiveOrgId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

      if (!asgErr && asgData) {
        asg = asgData as any;
      } else {
        // --------
        // Fallback (se non esiste relazione join)
        // --------
        const { data: asgPlain, error: asgPlainErr } = await supabase
          .from("machine_assignments")
          .select("machine_id, customer_org_id, assigned_at")
          .eq("manufacturer_org_id", effectiveOrgId)
          .eq("is_active", true)
          .order("assigned_at", { ascending: false });

        if (asgPlainErr) throw asgPlainErr;
        const plain = (asgPlain ?? []) as any as AssignmentRow[];

        const ids = [...new Set(plain.map((x) => x.machine_id).filter(Boolean))] as string[];
        let machinesMap = new Map<string, AssignedMachine>();

        if (ids.length > 0) {
          const { data: mData, error: mErr } = await supabase
            .from("machines")
            .select("id,name,internal_code,serial_number,category,lifecycle_state,photo_url,qr_code_token,organization_id")
            .in("id", ids);

          if (mErr) throw mErr;
          (mData ?? []).forEach((m: any) => machinesMap.set(m.id, m as AssignedMachine));
        }

        asg = plain.map((a) => ({ ...a, machines: machinesMap.get(a.machine_id) ?? null }));
      }

      setAssignments(asg);

      // default expand: tutti i clienti che hanno assegnazioni
      const withAsg = new Set(asg.map((a) => a.customer_org_id));
      setExpanded(new Set([...withAsg]));
    } catch (e: any) {
      console.error(e);
      toast({
        title: t("common.error") || "Errore",
        description: e?.message ?? "Errore caricamento assegnazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // --------------------------
  // GROUP + FILTER
  // --------------------------
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();

    // base map customerId -> assignments
    const map = new Map<string, AssignmentRow[]>();
    for (const a of assignments) {
      const list = map.get(a.customer_org_id) ?? [];
      list.push(a);
      map.set(a.customer_org_id, list);
    }

    const result = customers.map((c) => {
      const list = map.get(c.id) ?? [];
      const filtered = !q
        ? list
        : list.filter((a) => {
            const m = a.machines;
            const hay =
              `${c.name} ${m?.name ?? ""} ${m?.internal_code ?? ""} ${m?.serial_number ?? ""} ${m?.category ?? ""}`.toLowerCase();
            return hay.includes(q);
          });

      return { customer: c, items: filtered };
    });

    // se cerco qualcosa, mostro solo clienti con match
    const final = !q ? result : result.filter((x) => x.items.length > 0);
    return final;
  }, [customers, assignments, search]);

  const toggle = (customerId: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(customerId)) n.delete(customerId);
      else n.add(customerId);
      return n;
    });
  };

  if (loading) return null;

  return (
    <MainLayout userRole={ctx?.role as any}>
      <SEO title={`Assegnazioni - MACHINA`} />

      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-muted-foreground" />
              Assegnazioni macchine
            </h1>
            <p className="text-muted-foreground mt-1">
              Raggruppate per cliente (solo assegnazioni attive del costruttore)
            </p>
          </div>

          <Button variant="outline" className="border-border" onClick={loadAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca cliente / macchina / codice / matricola..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {grouped.length === 0 && (
          <Card className="rounded-2xl border-0 bg-card shadow-sm p-10 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <div className="text-lg font-semibold text-foreground">Nessuna assegnazione</div>
            <div className="text-sm text-muted-foreground mt-1">
              Non risultano macchine assegnate a clienti (is_active=true).
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {grouped.map(({ customer, items }) => {
            const isOpen = expanded.has(customer.id);

            return (
              <Card key={customer.id} className="rounded-2xl border-0 bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => toggle(customer.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-blue-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-blue-400" />
                  )}
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span className="text-foreground font-bold text-lg flex-1 truncate">{customer.name}</span>
                  <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                    {items.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    {items.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-2 py-3">Nessuna macchina assegnata.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map((a) => {
                          const m = a.machines;
                          const st = statusBadge(m?.lifecycle_state ?? "active");

                          return (
                            <Card
                              key={`${a.customer_org_id}-${a.machine_id}`}
                              className="rounded-2xl border border-border/50 bg-background/30 hover:bg-background/50 hover:border-blue-500/40 transition-all cursor-pointer"
                              onClick={() => router.push(`/equipment/${a.machine_id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                                    {m?.photo_url ? (
                                      <img
                                        src={m.photo_url}
                                        alt={m?.name ?? "machine"}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Wrench className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="font-semibold text-foreground truncate">
                                          {m?.name ?? "Macchina"}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono truncate">
                                          {m?.internal_code ?? "—"}{" "}
                                          {m?.serial_number ? `• SN ${m.serial_number}` : ""}
                                        </div>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${st.cls}`}>
                                    {st.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground border-border"
                                  >
                                    {m?.category ?? "Generico"}
                                  </Badge>
                                  {m?.qr_code_token ? (
                                    <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted/60 text-muted-foreground border border-border">
                                      QR
                                    </Badge>
                                  ) : null}
                                </div>

                                <div className="mt-3 text-xs text-muted-foreground">
                                  Assegnata:{" "}
                                  <span className="font-mono">
                                    {a.assigned_at ? new Date(a.assigned_at).toLocaleString() : "—"}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">
          Org: <span className="font-mono">{orgId ?? "—"}</span> • Type:{" "}
          <span className="font-mono">{orgType ?? "—"}</span>
        </div>
      </div>
    </MainLayout>
  );
}