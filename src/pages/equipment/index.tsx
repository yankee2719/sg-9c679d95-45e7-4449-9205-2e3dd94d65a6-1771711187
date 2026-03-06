// src/pages/equipment/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext, UserContext } from "@/lib/supabaseHelpers";
import { getPermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  MapPin,
  Filter,
  ChevronRight,
  ChevronDown,
  QrCode,
  Building2,
  LayoutGrid,
  List,
  Factory,
  Users,
  Package,
  EyeOff,
  Eye,
  UserPlus,
  Link2Off,
  Archive,
  Undo2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Machine {
  id: string;
  name: string;
  internal_code: string | null;
  category: string | null;
  serial_number: string | null;
  model: string | null;
  brand: string | null;
  position: string | null;
  lifecycle_state: string | null;
  qr_code_token: string | null;
  plant_id: string | null;
  photo_url: string | null;
  organization_id: string | null;

  // derived (manufacturer)
  _customerOrgId?: string | null;
  _isAssignedToCustomer?: boolean;

  // derived (common)
  _isArchived?: boolean;
}

interface Plant {
  id: string;
  name: string;
}

interface CustomerOrg {
  id: string;
  name: string;
}

type OrgType = "manufacturer" | "customer";
type ManufacturerTab = "active" | "archived";

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

// ✅ Robust: always resolve manufacturer org id from DB (prevents null manufacturer_org_id)
async function resolveManufacturerOrgId(effectiveOrgId: string): Promise<string> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,type")
    .eq("id", effectiveOrgId)
    .single();

  if (error) throw error;

  const t = String((data as any)?.type ?? "").toLowerCase();
  if (t !== "manufacturer") {
    throw new Error(
      `Org attiva non è manufacturer (type=${t}). Non posso assegnare macchine.`
    );
  }

  return (data as any).id as string;
}

export default function EquipmentPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<UserContext | null>(null);

  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(null);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);

  // Manufacturer tabs
  const [manufacturerTab, setManufacturerTab] = useState<ManufacturerTab>("active");

  // filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // customer-only filter
  const [sourceFilter, setSourceFilter] = useState("all"); // all|own|assigned

  // manufacturer-only filter (only in active tab)
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">(
    "all"
  );

  // views
  const [groupedView, setGroupedView] = useState(false);

  // actions state
  const [archiving, setArchiving] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // customer grouping
  const [plants, setPlants] = useState<Plant[]>([]);
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());

  // manufacturer grouping + customers list
  const [customers, setCustomers] = useState<CustomerOrg[]>([]);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // customer-hidden machines (local archive)
  const [hiddenMachineIds, setHiddenMachineIds] = useState<Set<string>>(new Set());
  const [showHiddenLocal, setShowHiddenLocal] = useState(false);
  const [togglingHide, setTogglingHide] = useState<string | null>(null);

  // manufacturer quick-assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMachine, setAssignMachine] = useState<Machine | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const perms = useMemo(() => {
    if (!ctx || !orgType) return null;
    return getPermissions({ role: (ctx as any).role, orgType: orgType as any });
  }, [ctx, orgType]);

  const isAdmin = perms?.isAdminOrSupervisor ?? false;
  const isCustomer = orgType === "customer";
  const isManufacturer = orgType === "manufacturer";

  const canLocalArchive = isCustomer && isAdmin;
  const canQuickAssign = isManufacturer && isAdmin;
  const canRevoke = isManufacturer && isAdmin;
  const canArchiveMachine = isManufacturer && isAdmin;
  const canRestoreMachine = isManufacturer && isAdmin;

  // ---------------------------
  // LOAD machines (depends on manufacturerTab)
  // ---------------------------
  const loadData = async (opts?: { tab?: ManufacturerTab }) => {
    setLoading(true);

    try {
      const userCtx = await getUserContext();
      if (!userCtx) {
        router.push("/login");
        return;
      }
      setCtx(userCtx);

        const orgId = userCtx.orgId ?? null;

      if (!orgId) throw new Error("Organization non trovata nel contesto utente.");
      setEffectiveOrgId(orgId);

      const type = await getOrgTypeById(orgId);
      if (!type) throw new Error("orgType non risolto");
      setOrgType(type);

      const tab = opts?.tab ?? manufacturerTab;

      // customer: load hidden local
      if (type === "customer") {
        const { data: hidden, error: hiddenErr } = await supabase
          .from("customer_hidden_machines")
          .select("machine_id")
          .eq("customer_org_id", orgId);

        if (hiddenErr) throw hiddenErr;
        setHiddenMachineIds(new Set((hidden ?? []).map((r: any) => r.machine_id)));
      } else {
        setHiddenMachineIds(new Set());
      }

      // load machines (RLS decides visibility)
      const isArchivedFlag = type === "manufacturer" ? tab === "archived" : false;

      const { data: machineData, error: machineErr } = await supabase
        .from("machines")
        .select(
          "id, name, internal_code, category, serial_number, model, brand, position, lifecycle_state, qr_code_token, plant_id, photo_url, organization_id, is_archived"
        )
        .eq("is_archived", isArchivedFlag)
        .order("name");

      if (machineErr) throw machineErr;

      let allMachines = (machineData ?? []).map((m: any) => ({
        ...(m as Machine),
        _isArchived: !!m.is_archived,
      })) as Machine[];

      // customer: mark assigned (for badge + filter)
      if (type === "customer") {
        const { data: assigns, error: assErr } = await supabase
          .from("machine_assignments")
          .select("machine_id")
          .eq("customer_org_id", orgId)
          .eq("is_active", true);

        if (assErr) throw assErr;

        const assignedIds = new Set((assigns ?? []).map((a: any) => a.machine_id));

        allMachines = allMachines.map((m) => ({
          ...m,
          _isAssignedToCustomer: assignedIds.has(m.id),
        }));

        // Customer: ONLY admin should see grouping by plant
        if ((userCtx as any)?.role === "admin") {
          const { data: plantsData } = await supabase
            .from("plants")
            .select("id, name")
            .eq("is_archived", false)
            .order("name");

          setPlants((plantsData ?? []) as Plant[]);
          setGroupedView(true);
        } else {
          setPlants([]);
          setGroupedView(false);
        }
      }

      // manufacturer: assigned info + customers list (only meaningful on ACTIVE tab)
      if (type === "manufacturer") {
        if (tab === "active") {
          const { data: assigns, error: assErr } = await supabase
            .from("machine_assignments")
            .select("machine_id, customer_org_id")
            .eq("manufacturer_org_id", orgId)
            .eq("is_active", true);

          if (assErr) throw assErr;

          const byMachine = new Map<string, string>();
          for (const a of assigns ?? []) {
            if (a.machine_id && a.customer_org_id) byMachine.set(a.machine_id, a.customer_org_id);
          }

          allMachines = allMachines.map((m) => ({
            ...m,
            _customerOrgId: byMachine.get(m.id) || null,
            _isAssignedToCustomer: !!byMachine.get(m.id),
          }));
        } else {
          // Archived: no assignments shown/used
          allMachines = allMachines.map((m) => ({
            ...m,
            _customerOrgId: null,
            _isAssignedToCustomer: false,
          }));
        }

        const { data: allCust, error: allCustErr } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("type", "customer")
          .eq("manufacturer_org_id", orgId)
          .order("name", { ascending: true });

        if (allCustErr) throw allCustErr;
        setCustomers((allCust ?? []) as CustomerOrg[]);
        setGroupedView(true);
      }

      setMachines(allMachines);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Errore",
        description: error?.message || "Errore nel caricamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!orgType) return;
    if (orgType !== "manufacturer") return;
    loadData({ tab: manufacturerTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manufacturerTab]);

  // ---------------------------
  // ACTIONS
  // ---------------------------
  const toggleHideLocal = async (e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    if (!isCustomer || !effectiveOrgId) return;

    if (!isAdmin) {
      toast({
        title: "Permesso negato",
        description: "Solo Admin/Supervisor possono archiviare.",
        variant: "destructive",
      });
      return;
    }

    setTogglingHide(machineId);
    try {
      const isHidden = hiddenMachineIds.has(machineId);

      if (isHidden) {
        const { error } = await supabase
          .from("customer_hidden_machines")
          .delete()
          .eq("customer_org_id", effectiveOrgId)
          .eq("machine_id", machineId);

        if (error) throw error;

        setHiddenMachineIds((prev) => {
          const n = new Set(prev);
          n.delete(machineId);
          return n;
        });

        toast({ title: "Ripristinata", description: "Macchina ripristinata nella lista." });
      } else {
        const { error } = await supabase
          .from("customer_hidden_machines")
          .insert({ customer_org_id: effectiveOrgId, machine_id: machineId });

        if (error) throw error;

        setHiddenMachineIds((prev) => {
          const n = new Set(prev);
          n.add(machineId);
          return n;
        });

        toast({
          title: "Archiviata",
          description: "Macchina archiviata localmente (solo per questo cliente).",
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Errore",
        description: err?.message ?? "Errore",
        variant: "destructive",
      });
    } finally {
      setTogglingHide(null);
    }
  };

  const openAssignDialog = (e: React.MouseEvent, m: Machine) => {
    e.stopPropagation();
    setAssignMachine(m);
    setAssignCustomerId("");
    setAssignOpen(true);
  };

  // ✅ FIXED: no null manufacturer_org_id (resolved from DB)
  const doAssign = async () => {
    if (!assignMachine || !assignCustomerId || !effectiveOrgId) return;

    setAssigning(true);
    try {
      const manufacturerOrgId = await resolveManufacturerOrgId(effectiveOrgId);

      // deactivate any existing active assignment for this machine (for this manufacturer)
      const { error: deactivateErr } = await supabase
        .from("machine_assignments")
        .update({ is_active: false })
        .eq("machine_id", assignMachine.id)
        .eq("manufacturer_org_id", manufacturerOrgId)
        .eq("is_active", true);

      if (deactivateErr) throw deactivateErr;

      const { data: userRes } = await supabase.auth.getUser();
      const assignedBy = userRes?.user?.id ?? null;

      const payload: any = {
        machine_id: assignMachine.id,
        customer_org_id: assignCustomerId,
        manufacturer_org_id: manufacturerOrgId, // ✅ never null
        is_active: true,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("machine_assignments").insert(payload);
      if (error) throw error;

      setMachines((prev) =>
        prev.map((x) =>
          x.id === assignMachine.id
            ? { ...x, _customerOrgId: assignCustomerId, _isAssignedToCustomer: true }
            : x
        )
      );

      toast({ title: "OK", description: "Macchina assegnata" });
      setAssignOpen(false);
    } catch (e: any) {
      console.error("ASSIGN ERROR", e);
      toast({
        title: "Errore assegnazione",
        description: e?.message ?? "Bad Request",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const revokeAssignment = async (e: React.MouseEvent, m: Machine) => {
    e.stopPropagation();
    if (!effectiveOrgId) return;

    if (!m._customerOrgId) {
      toast({
        title: "Nessuna assegnazione",
        description: "La macchina risulta già non assegnata.",
      });
      return;
    }

    if (!confirm(`Vuoi revocare l'assegnazione di "${m.name}"?`)) return;

    setRevoking(m.id);
    try {
      const manufacturerOrgId = await resolveManufacturerOrgId(effectiveOrgId);

      const { error } = await supabase
        .from("machine_assignments")
        .update({ is_active: false }) // trigger audit compila revoked_at/by
        .eq("machine_id", m.id)
        .eq("manufacturer_org_id", manufacturerOrgId)
        .eq("is_active", true);

      if (error) throw error;

      setMachines((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, _customerOrgId: null, _isAssignedToCustomer: false } : x))
      );

      toast({ title: "OK", description: "Assegnazione revocata" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Errore",
        description: err?.message ?? "Errore revoca",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  const archiveMachine = async (e: React.MouseEvent, m: Machine) => {
    e.stopPropagation();

    if (m._customerOrgId) {
      toast({
        title: "Azione non consentita",
        description: "Prima revoca l'assegnazione, poi puoi archiviare la macchina.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Vuoi ARCHIVIARE "${m.name}"? (non verrà eliminata)`)) return;

    setArchiving(m.id);
    try {
      const { error } = await supabase.from("machines").update({ is_archived: true }).eq("id", m.id);
      if (error) throw error;

      setMachines((prev) => prev.filter((x) => x.id !== m.id));
      toast({ title: "OK", description: "Macchina archiviata" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Errore",
        description: err?.message ?? "Errore archiviazione",
        variant: "destructive",
      });
    } finally {
      setArchiving(null);
    }
  };

  const restoreMachine = async (e: React.MouseEvent, m: Machine) => {
    e.stopPropagation();
    if (!confirm(`Vuoi RIPRISTINARE "${m.name}" tra le macchine attive?`)) return;

    setRestoring(m.id);
    try {
      const { error } = await supabase.from("machines").update({ is_archived: false }).eq("id", m.id);
      if (error) throw error;

      setMachines((prev) => prev.filter((x) => x.id !== m.id));
      toast({ title: "OK", description: "Macchina ripristinata" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Errore",
        description: err?.message ?? "Errore ripristino",
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
    }
  };

  // ---------------------------
  // FILTERS
  // ---------------------------
  useEffect(() => {
    let filtered = machines;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          (m.internal_code ?? "").toLowerCase().includes(q) ||
          (m.serial_number ?? "").toLowerCase().includes(q) ||
          (m.position ?? "").toLowerCase().includes(q) ||
          (m.brand ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") filtered = filtered.filter((m) => m.lifecycle_state === statusFilter);
    if (categoryFilter !== "all") filtered = filtered.filter((m) => m.category === categoryFilter);

    if (orgType === "customer") {
      if (sourceFilter === "own") filtered = filtered.filter((m) => !m._isAssignedToCustomer);
      if (sourceFilter === "assigned") filtered = filtered.filter((m) => !!m._isAssignedToCustomer);

      if (!showHiddenLocal && hiddenMachineIds.size > 0) {
        filtered = filtered.filter((m) => !hiddenMachineIds.has(m.id));
      }
    }

    if (orgType === "manufacturer" && manufacturerTab === "active") {
      if (assignmentFilter === "assigned") filtered = filtered.filter((m) => !!m._customerOrgId);
      if (assignmentFilter === "unassigned") filtered = filtered.filter((m) => !m._customerOrgId);
    }

    setFilteredMachines(filtered);
  }, [
    machines,
    searchQuery,
    statusFilter,
    categoryFilter,
    sourceFilter,
    orgType,
    hiddenMachineIds,
    showHiddenLocal,
    assignmentFilter,
    manufacturerTab,
  ]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const m of machines) if (m.category) set.add(m.category);
    return Array.from(set).sort();
  }, [machines]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const m of machines) if (m.lifecycle_state) set.add(m.lifecycle_state);
    return Array.from(set).sort();
  }, [machines]);

  const groupedByPlant = useMemo(() => {
    const map = new Map<string, Machine[]>();
    for (const m of filteredMachines) {
      const key = m.plant_id ?? "no-plant";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const [k, arr] of map.entries()) {
      map.set(k, arr.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    }
    return map;
  }, [filteredMachines]);

  const groupedByCustomer = useMemo(() => {
    const map = new Map<string, Machine[]>();
    for (const m of filteredMachines) {
      const key = m._customerOrgId ?? "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const [k, arr] of map.entries()) {
      map.set(k, arr.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    }
    return map;
  }, [filteredMachines]);

  const plantName = (plantId: string) => {
    if (plantId === "no-plant") return "Senza stabilimento";
    return plants.find((p) => p.id === plantId)?.name || "Stabilimento";
  };

  const customerName = (customerOrgId: string) => {
    if (customerOrgId === "unassigned") return "Non assegnate";
    return customers.find((c) => c.id === customerOrgId)?.name || "Cliente";
  };

  const toggleExpandedPlant = (id: string) => {
    setExpandedPlants((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleExpandedCustomer = (id: string) => {
    setExpandedCustomers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const renderMachineCard = (item: Machine) => {
    const isHiddenLocal = hiddenMachineIds.has(item.id);

    const isUnassigned = isManufacturer && !item._customerOrgId;
    const isAssigned = isManufacturer && !!item._customerOrgId;
    const inArchivedTab = isManufacturer && manufacturerTab === "archived";

    return (
      <Card
        key={item.id}
        className="group cursor-pointer hover:border-[#FF6B35]/40 transition-colors"
        onClick={() => router.push(`/equipment/${item.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {item.internal_code ?? "—"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {item.qr_code_token && (
                <div className="p-1 rounded-md bg-muted/60">
                  <QrCode className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}

              {/* Manufacturer: ACTIVE tab actions */}
              {isManufacturer && !inArchivedTab && (
                <>
                  {canQuickAssign && isUnassigned && (
                    <button
                      onClick={(e) => openAssignDialog(e, item)}
                      title="Assegna a cliente"
                      className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}

                  {canRevoke && isAssigned && (
                    <button
                      onClick={(e) => revokeAssignment(e, item)}
                      disabled={revoking === item.id}
                      title="Revoca assegnazione"
                      className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <Link2Off className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}

                  {canArchiveMachine && (
                    <button
                      onClick={(e) => archiveMachine(e, item)}
                      disabled={archiving === item.id || isAssigned}
                      title={
                        isAssigned ? "Prima revoca l'assegnazione per archiviare" : "Archivia macchina"
                      }
                      className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </>
              )}

              {/* Manufacturer: ARCHIVED tab actions */}
              {isManufacturer && inArchivedTab && canRestoreMachine && (
                <button
                  onClick={(e) => restoreMachine(e, item)}
                  disabled={restoring === item.id}
                  title="Ripristina macchina"
                  className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <Undo2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}

              {/* Customer: local hide/unhide */}
              {canLocalArchive && (
                <button
                  onClick={(e) => toggleHideLocal(e, item.id)}
                  disabled={togglingHide === item.id}
                  title={isHiddenLocal ? "Ripristina" : "Archivia localmente"}
                  className="p-1 rounded-md bg-muted/60 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {isHiddenLocal ? (
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              )}

              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.category && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                <Package className="w-3 h-3 mr-1" />
                {item.category}
              </Badge>
            )}

            {isManufacturer && manufacturerTab === "active" && item._customerOrgId && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
                <Factory className="w-3 h-3 mr-1" />
                {customerName(item._customerOrgId)}
              </Badge>
            )}

            {isManufacturer && manufacturerTab === "active" && !item._customerOrgId && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                Non assegnata
              </Badge>
            )}

            {isManufacturer && manufacturerTab === "archived" && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                Archiviata
              </Badge>
            )}

            {isCustomer && item._isAssignedToCustomer && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30">
                <Factory className="w-3 h-3 mr-1" />
                Assegnata
              </Badge>
            )}

            {isCustomer && isHiddenLocal && (
              <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30">
                Archiviata (locale)
              </Badge>
            )}
          </div>

          {item.position && (
            <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{item.position}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <SEO title={t("equipment.title")} />
        <div className="p-6">{t("common.loading")}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <SEO title={t("equipment.title")} />

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{t("equipment.title")}</h1>
            <p className="text-muted-foreground">{t("equipment.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupedView((v) => !v)}
              className="border-border"
              title="Cambia visualizzazione"
            >
              {groupedView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">{groupedView ? "Griglia" : "Per gruppi"}</span>
            </Button>

            {orgType === "customer" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHiddenLocal((v) => !v)}
                className="border-border"
              >
                {showHiddenLocal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">
                  {showHiddenLocal ? "Nascondi archiviate" : "Mostra archiviate"}
                </span>
              </Button>
            )}

            {isAdmin && (
              <Button
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                onClick={() => router.push("/equipment/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("equipment.new")}
              </Button>
            )}
          </div>
        </div>

        {/* Manufacturer tabs */}
        {isManufacturer && (
          <div className="flex items-center gap-2">
            <Button
              variant={manufacturerTab === "active" ? "default" : "outline"}
              onClick={() => setManufacturerTab("active")}
              className={manufacturerTab === "active" ? "bg-[#FF6B35] hover:bg-[#e55a2b] text-white" : ""}
            >
              Attive
            </Button>
            <Button
              variant={manufacturerTab === "archived" ? "default" : "outline"}
              onClick={() => setManufacturerTab("archived")}
              className={
                manufacturerTab === "archived" ? "bg-[#FF6B35] hover:bg-[#e55a2b] text-white" : ""
              }
            >
              Archiviate
            </Button>

            <Badge variant="outline" className="ml-2">
              {filteredMachines.length} mostrate
            </Badge>
          </div>
        )}

        {/* FILTER BAR */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Filter className="w-4 h-4" />
                  <span>{t("common.filter")}</span>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {orgType === "customer" && (
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Provenienza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      <SelectItem value="own">Solo mie</SelectItem>
                      <SelectItem value="assigned">Assegnate da costruttore</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {orgType === "manufacturer" && manufacturerTab === "active" && (
                  <Select
                    value={assignmentFilter}
                    onValueChange={(v) => setAssignmentFilter(v as "all" | "assigned" | "unassigned")}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Assegnazione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      <SelectItem value="assigned">Solo assegnate</SelectItem>
                      <SelectItem value="unassigned">Solo non assegnate</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LIST */}
        {!groupedView ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredMachines.map(renderMachineCard)}
            {filteredMachines.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("equipment.noEquipment")}</div>
            )}
          </div>
        ) : isCustomer ? (
          <div className="space-y-3">
            {Array.from(groupedByPlant.entries())
              .sort((a, b) => plantName(a[0]).localeCompare(plantName(b[0])))
              .map(([plantId, list]) => {
                const open = expandedPlants.has(plantId);
                return (
                  <Card key={plantId}>
                    <CardContent className="p-4">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => toggleExpandedPlant(plantId)}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{plantName(plantId)}</span>
                          <Badge variant="secondary" className="rounded-full">
                            {list.length}
                          </Badge>
                        </div>
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {open && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {list.map(renderMachineCard)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(groupedByCustomer.entries())
              .sort((a, b) => customerName(a[0]).localeCompare(customerName(b[0])))
              .map(([custOrgId, list]) => {
                const open = expandedCustomers.has(custOrgId);
                return (
                  <Card key={custOrgId}>
                    <CardContent className="p-4">
                      <button
                        className="w-full flex items-center justify-between"
                        onClick={() => toggleExpandedCustomer(custOrgId)}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{customerName(custOrgId)}</span>
                          <Badge variant="secondary" className="rounded-full">
                            {list.length}
                          </Badge>
                        </div>
                        {open ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {open && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {list.map(renderMachineCard)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Quick assign dialog (manufacturer) */}
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assegna macchina</DialogTitle>
              <DialogDescription>
                Seleziona il cliente a cui assegnare{" "}
                <span className="font-medium">{assignMachine?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Select value={assignCustomerId} onValueChange={setAssignCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {customers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nessun cliente disponibile. Crea prima un cliente associato al tuo manufacturer.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>
                Annulla
              </Button>
              <Button
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                onClick={doAssign}
                disabled={!assignCustomerId || assigning || !assignMachine}
              >
                {assigning ? "Assegnazione..." : "Assegna"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}