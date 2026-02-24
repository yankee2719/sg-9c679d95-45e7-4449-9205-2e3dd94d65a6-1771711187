import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Factory, Building2, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CustomerOrg = { id: string; name: string };
type MachineRow = { id: string; name: string; internal_code: string | null; lifecycle_state: string | null };
type AssignmentRow = {
  id: string;
  customer_org_id: string;
  machine_id: string;
  assigned_at: string;
  is_active: boolean;
  machines?: MachineRow | null;
  customers?: CustomerOrg | null;
};

export default function AssignmentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("technician");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgType, setOrgType] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [customers, setCustomers] = useState<CustomerOrg[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const isManufacturer = orgType === "manufacturer";
  const canEdit = userRole === "admin" || userRole === "supervisor";

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx) {
          router.push("/login");
          return;
        }
        setUserRole(ctx.role ?? "technician");
        setOrgId(ctx.orgId ?? null);
        setOrgType(ctx.orgType ?? null);

        if ((ctx.orgType ?? null) !== "manufacturer" || !ctx.orgId) {
          toast({ title: "Accesso negato", description: "Questa pagina è per Costruttori.", variant: "destructive" });
          router.push("/dashboard");
          return;
        }

        // Customers list
        const { data: custData, error: custErr } = await supabase
          .from("organizations")
          .select("id,name")
          .eq("manufacturer_org_id", ctx.orgId)
          .eq("type", "customer")
          .order("name", { ascending: true });

        if (custErr) throw custErr;
        const cust = (custData ?? []) as any as CustomerOrg[];
        setCustomers(cust);
        setExpanded(new Set(cust.map((c) => c.id)));

        // Assignments with machines + customer
        const { data: asgData, error: asgErr } = await supabase
          .from("machine_assignments")
          .select(`
            id,
            customer_org_id,
            machine_id,
            assigned_at,
            is_active,
            machines:machines(id,name,internal_code,lifecycle_state),
            customers:organizations!machine_assignments_customer_org_id_fkey(id,name)
          `)
          .eq("manufacturer_org_id", ctx.orgId)
          .eq("is_active", true)
          .order("assigned_at", { ascending: false });

        if (asgErr) throw asgErr;
        setAssignments(((asgData as any) ?? []) as AssignmentRow[]);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Errore", description: e?.message ?? "Errore caricamento", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, { customer: CustomerOrg; rows: AssignmentRow[] }>();

    for (const c of customers) map.set(c.id, { customer: c, rows: [] });

    for (const a of assignments) {
      const cId = a.customer_org_id;
      const bucket = map.get(cId);
      if (!bucket) continue;

      const m = a.machines;
      const match =
        !q ||
        (bucket.customer.name ?? "").toLowerCase().includes(q) ||
        (m?.name ?? "").toLowerCase().includes(q) ||
        (m?.internal_code ?? "").toLowerCase().includes(q);

      if (match) bucket.rows.push(a);
    }

    // Remove empty groups when searching
    const arr = [...map.values()].filter((g) => (query ? g.rows.length > 0 : true));
    return arr;
  }, [customers, assignments, query]);

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
    <MainLayout userRole={userRole as any}>
      <SEO title="Assegnazioni Macchine - MACHINA" />

      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Factory className="w-6 h-6 text-purple-400" />
              Assegnazioni Macchine
            </h1>
            <p className="text-muted-foreground">Macchine raggruppate per cliente</p>
          </div>

          {canEdit && (
            <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/equipment/new")}>
              Assegna nuova macchina
            </Button>
          )}
        </div>

        <Card className="rounded-2xl border-0 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per cliente o macchina..."
                className="pl-10 bg-background border-border rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {!isManufacturer ? (
          <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardContent className="p-6 text-muted-foreground">Pagina disponibile solo per costruttori.</CardContent>
          </Card>
        ) : grouped.length === 0 ? (
          <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardContent className="p-6 text-muted-foreground">Nessuna assegnazione trovata.</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => {
              const open = expanded.has(g.customer.id);
              return (
                <Card key={g.customer.id} className="rounded-2xl border-0 bg-card shadow-sm overflow-hidden">
                  <CardHeader className="pb-3">
                    <button
                      type="button"
                      onClick={() => toggle(g.customer.id)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {open ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        <Building2 className="w-5 h-5 text-blue-400" />
                        <div className="min-w-0">
                          <CardTitle className="text-foreground truncate">{g.customer.name}</CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {g.rows.length} macchine assegnate
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30">
                        {g.rows.length}
                      </Badge>
                    </button>
                  </CardHeader>

                  {open && (
                    <CardContent className="pt-0 pb-4">
                      {g.rows.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-2">Nessuna macchina per questo cliente.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {g.rows.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => router.push(`/equipment/${a.machine_id}`)}
                              className="text-left p-4 rounded-xl border border-border bg-background hover:bg-muted/20 transition-colors"
                            >
                              <div className="font-semibold text-foreground truncate">{a.machines?.name ?? "—"}</div>
                              <div className="text-xs text-muted-foreground font-mono truncate">{a.machines?.internal_code ?? a.machine_id}</div>
                              <div className="text-xs text-muted-foreground mt-2">Assegnata: {new Date(a.assigned_at).toLocaleString()}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}