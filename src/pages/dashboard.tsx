import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  QrCode, ArrowRight, Wrench, ClipboardList, Clock, ChevronRight,
  AlertTriangle, Users, Shield, Globe, Factory, Building2, FileText,
  Package, UserPlus, Settings,
} from "lucide-react";
import { useLanguage, Language, languageFlags, languageNames } from "@/contexts/LanguageContext";

export default function DashboardPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("technician");
  const [orgType, setOrgType] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

  // Customer stats
  const [stats, setStats] = useState({
    totalMachines: 0, activeChecklists: 0, upcomingMaintenance: 0, overdueItems: 0,
  });
  const [userStats, setUserStats] = useState({ total: 0, admins: 0, supervisors: 0, technicians: 0 });
  const [machineList, setMachineList] = useState<any[]>([]);

  // Manufacturer stats
  const [mfrStats, setMfrStats] = useState({
    totalMachines: 0, totalCustomers: 0, totalAssignments: 0, totalDocs: 0,
  });
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [recentMachines, setRecentMachines] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const ctx = await getUserContext();
        if (!ctx) { router.push("/login"); return; }

        setUserName(ctx.displayName);
        setUserRole(ctx.role);
        setOrgType(ctx.orgType);

        if (ctx.orgType === "manufacturer") {
          await loadManufacturerDashboard(ctx.orgId!);
        } else {
          await loadCustomerDashboard(ctx.orgId!);
          if (ctx.role === "admin") await loadUserStats(ctx.orgId!);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  // ═══════════════════════════════════════════
  // CUSTOMER DASHBOARD DATA
  // ═══════════════════════════════════════════
  const loadCustomerDashboard = async (orgId: string) => {
    try {
      const { count: machineCount } = await supabase
        .from("machines").select("*", { count: "exact", head: true });

      const { count: checkCount } = await supabase
        .from("checklists").select("*", { count: "exact", head: true }).eq("is_active", true);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const { count: upcomingCount } = await supabase
        .from("maintenance_plans").select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .lte("next_due_date", futureDate.toISOString())
        .gte("next_due_date", new Date().toISOString());

      const { count: overdueCount } = await supabase
        .from("maintenance_plans").select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .lt("next_due_date", new Date().toISOString());

      const { data: machines } = await supabase
        .from("machines").select("id, name, position, category, lifecycle_state, photo_url")
        .order("created_at", { ascending: false }).limit(5);

      setStats({
        totalMachines: machineCount || 0,
        activeChecklists: checkCount || 0,
        upcomingMaintenance: upcomingCount || 0,
        overdueItems: overdueCount || 0,
      });
      setMachineList(machines || []);
    } catch (error) {
      console.error("Error loading customer dashboard:", error);
    }
  };

  const loadUserStats = async (orgId: string) => {
    try {
      const { data: members } = await supabase
        .from("organization_memberships").select("role")
        .eq("organization_id", orgId).eq("is_active", true);

      if (members) {
        setUserStats({
          total: members.length,
          admins: members.filter(m => m.role === "admin").length,
          supervisors: members.filter(m => m.role === "supervisor").length,
          technicians: members.filter(m => m.role === "technician").length,
        });
      }
    } catch (error) { console.error(error); }
  };

  // ═══════════════════════════════════════════
  // MANUFACTURER DASHBOARD DATA
  // ═══════════════════════════════════════════
  const loadManufacturerDashboard = async (orgId: string) => {
    try {
      // Machines created by manufacturer
      const { count: machineCount } = await supabase
        .from("machines").select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      // Customer orgs linked to this manufacturer
      const { data: customers, count: customerCount } = await supabase
        .from("organizations").select("id, name, slug, city, created_at", { count: "exact" })
        .eq("manufacturer_org_id", orgId)
        .order("created_at", { ascending: false });

      // Total machine assignments
      const { count: assignmentCount } = await supabase
        .from("machine_assignments").select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Recent machines
      const { data: machines } = await supabase
        .from("machines").select("id, name, internal_code, category, lifecycle_state, photo_url")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(6);

      setMfrStats({
        totalMachines: machineCount || 0,
        totalCustomers: customerCount || 0,
        totalAssignments: assignmentCount || 0,
        totalDocs: 0,
      });
      setCustomerList(customers || []);
      setRecentMachines(machines || []);
    } catch (error) {
      console.error("Error loading manufacturer dashboard:", error);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: t("users.admin"),
      supervisor: language === "it" ? "Supervisore" : "Supervisor",
      technician: t("users.technician"),
    };
    return labels[role] || role;
  };

  const getLifecycleConfig = (state: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      active: { label: "Attivo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      commissioned: { label: "Attivo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      inactive: { label: "Inattivo", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
      under_maintenance: { label: "Manutenzione", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      decommissioned: { label: "Dismesso", color: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    return configs[state] || configs.active;
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`Dashboard - MACHINA`} />
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Welcome Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-muted-foreground text-sm mb-1">{t("dashboard.welcome")},</p>
            <h1 className="text-3xl font-bold text-foreground">{userName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                <SelectTrigger className="w-[160px] bg-card border-border text-foreground">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span>{languageFlags[language]}</span>
                      <span>{languageNames[language]}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["it", "en", "fr", "es"] as Language[]).map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      <span className="flex items-center gap-2">
                        <span>{languageFlags[lang]}</span>
                        <span>{languageNames[lang]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className={`px-4 py-2 text-sm font-medium ${
              orgType === "manufacturer"
                ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                : "border-[#FF6B35]/30 bg-[#FF6B35]/10 text-[#FF6B35]"
            }`}>
              {orgType === "manufacturer" ? "🏭 Costruttore" : `👤 ${getRoleLabel(userRole)}`}
            </Badge>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* MANUFACTURER DASHBOARD                 */}
        {/* ═══════════════════════════════════════ */}
        {orgType === "manufacturer" ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-2xl border-border bg-card/80 hover:border-purple-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/equipment")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Wrench className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{mfrStats.totalMachines}</h3>
                  <p className="font-medium text-muted-foreground text-sm">Macchine Prodotte</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-blue-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/customers")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{mfrStats.totalCustomers}</h3>
                  <p className="font-medium text-muted-foreground text-sm">Clienti</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-green-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/assignments")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Package className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{mfrStats.totalAssignments}</h3>
                  <p className="font-medium text-muted-foreground text-sm">Macchine Assegnate</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-amber-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/admin/users")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{mfrStats.totalCustomers}</h3>
                  <p className="font-medium text-muted-foreground text-sm">Account Clienti</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 p-6 text-white cursor-pointer hover:scale-[1.01] transition-all"
                onClick={() => router.push("/equipment/new")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Nuova Macchina</h3>
                    <p className="text-purple-200 text-sm">Aggiungi al catalogo</p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white cursor-pointer hover:scale-[1.01] transition-all"
                onClick={() => router.push("/customers/new")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Nuovo Cliente</h3>
                    <p className="text-blue-200 text-sm">Crea organizzazione cliente</p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-6 text-white cursor-pointer hover:scale-[1.01] transition-all"
                onClick={() => router.push("/assignments")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Assegna Macchine</h3>
                    <p className="text-green-200 text-sm">Collega macchine ai clienti</p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </div>
              </div>
            </div>

            {/* Customers List */}
            {customerList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-bold text-foreground">Clienti Recenti</h3>
                  <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                    <Link href="/customers">Vedi tutti</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customerList.slice(0, 6).map((customer) => (
                    <Card key={customer.id}
                      className="rounded-2xl border-border bg-card/80 hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => router.push(`/customers/${customer.id}`)}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground truncate">{customer.name}</h4>
                          <p className="text-sm text-muted-foreground">{customer.city || customer.slug}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Machines */}
            {recentMachines.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-bold text-foreground">Ultime Macchine</h3>
                  <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                    <Link href="/equipment">Vedi tutte</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentMachines.map((machine) => {
                    const lifecycle = getLifecycleConfig(machine.lifecycle_state || "active");
                    return (
                      <Card key={machine.id}
                        className="rounded-2xl border-border bg-card/80 hover:border-purple-500/50 transition-all cursor-pointer group"
                        onClick={() => router.push(`/equipment/${machine.id}`)}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center overflow-hidden">
                            {machine.photo_url
                              ? <img src={machine.photo_url} alt={machine.name} className="w-full h-full object-cover" />
                              : <Wrench className="w-6 h-6 text-purple-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground truncate">{machine.name}</h4>
                            <p className="text-xs text-muted-foreground font-mono">{machine.internal_code}</p>
                          </div>
                          <Badge className={`text-xs border ${lifecycle.color}`}>{lifecycle.label}</Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state for new manufacturers */}
            {mfrStats.totalMachines === 0 && mfrStats.totalCustomers === 0 && (
              <Card className="rounded-2xl border-border bg-card/80 p-12 text-center">
                <Factory className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Benvenuto in MACHINA!</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Come costruttore, inizia aggiungendo le tue macchine al catalogo, poi crea le organizzazioni dei tuoi clienti e assegna le macchine.
                </p>
                <div className="flex justify-center gap-4">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => router.push("/equipment/new")}>
                    <Wrench className="w-4 h-4 mr-2" /> Aggiungi Macchina
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/customers/new")}>
                    <UserPlus className="w-4 h-4 mr-2" /> Crea Cliente
                  </Button>
                </div>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* ═══════════════════════════════════════ */}
            {/* CUSTOMER / END-USER DASHBOARD          */}
            {/* ═══════════════════════════════════════ */}

            {/* QR Scanner Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-[#FF6B35] via-[#FF7B47] to-[#FF8C61] p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01]"
              onClick={() => router.push("/scanner")}>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{t("dashboard.scanQR")}</h2>
                    <p className="text-white/90 font-medium">{t("nav.scanner")}</p>
                  </div>
                </div>
                <div className="bg-white/20 p-3 rounded-full"><ArrowRight className="w-6 h-6 text-white" /></div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>

            {/* Admin card */}
            {userRole === "admin" && (
              <div className="rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 p-8 text-white shadow-xl cursor-pointer transition-all hover:scale-[1.01]"
                onClick={() => router.push("/admin/users")}>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-1">{t("users.title")}</h2>
                        <p className="text-purple-50 font-medium">{t("nav.users")}</p>
                      </div>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full"><ArrowRight className="w-6 h-6 text-white" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-2xl p-4">
                      <Users className="w-5 h-5 text-white/80 mb-2" />
                      <div className="text-2xl font-bold mb-1">{userStats.total}</div>
                      <div className="text-sm text-purple-100">{t("common.all")}</div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <Shield className="w-5 h-5 text-white/80 mb-2" />
                      <div className="text-2xl font-bold mb-1">{userStats.admins}</div>
                      <div className="text-sm text-purple-100">{t("users.admin")}</div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <Users className="w-5 h-5 text-white/80 mb-2" />
                      <div className="text-2xl font-bold mb-1">{userStats.supervisors}</div>
                      <div className="text-sm text-purple-100">{getRoleLabel("supervisor")}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-2xl border-border bg-card/80 hover:border-blue-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/equipment")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Wrench className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{stats.totalMachines}</h3>
                  <p className="font-medium text-muted-foreground text-sm">{t("dashboard.totalEquipment")}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-green-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/checklists")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                    <ClipboardList className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{stats.activeChecklists}</h3>
                  <p className="font-medium text-muted-foreground text-sm">{t("checklists.active")}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-orange-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/maintenance")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{stats.upcomingMaintenance}</h3>
                  <p className="font-medium text-muted-foreground text-sm">{t("dashboard.upcomingMaintenance")}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card/80 hover:border-red-500/50 cursor-pointer transition-all"
                onClick={() => router.push("/maintenance")}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-foreground">{stats.overdueItems}</h3>
                  <p className="font-medium text-muted-foreground text-sm">{t("dashboard.overdueItems")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Machine List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-foreground">{t("equipment.title")}</h3>
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300 font-medium p-0 h-auto hover:bg-transparent" asChild>
                  <Link href="/equipment">{t("dashboard.viewAll")}</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {machineList.map((item) => {
                  const lifecycle = getLifecycleConfig(item.lifecycle_state || "active");
                  return (
                    <Card key={item.id}
                      className="rounded-2xl border-border bg-card/80 hover:border-blue-500/50 transition-all overflow-hidden cursor-pointer group"
                      onClick={() => router.push(`/equipment/${item.id}`)}>
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                          {item.photo_url
                            ? <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Wrench className="w-6 h-6 text-muted-foreground" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground truncate">{item.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">{item.position || t("equipment.noLocation")}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{item.category || t("equipment.generic")}</span>
                            <Badge className={`text-xs border ${lifecycle.color}`}>{lifecycle.label}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-400" />
                      </div>
                    </Card>
                  );
                })}
                {machineList.length === 0 && (
                  <Card className="rounded-2xl border-border bg-card/80 p-8 text-center col-span-full">
                    <Wrench className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">{t("equipment.noEquipment")}</p>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
