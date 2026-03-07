// src/components/Layout/MainLayout.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getNotificationCount, getUserContext } from "@/lib/supabaseHelpers";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import {
  LayoutDashboard,
  Wrench,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Bell,
  Users,
  QrCode,
  BarChart3,
  Building2,
  Factory,
  FileText,
  ShieldCheck,
  CheckSquare,
  Package,
  Layers3,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type UserRole = "admin" | "supervisor" | "technician" | string;
type OrgType = "manufacturer" | "customer" | null;

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles?: string[];
  orgTypes?: Array<"manufacturer" | "customer">;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileName, setProfileName] = useState("Utente");
  const [profileRole, setProfileRole] = useState<string>(userRole);
  const [orgType, setOrgType] = useState<OrgType>(null);
  const [orgName, setOrgName] = useState("Organizzazione");
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const loadHeader = async () => {
      try {
        const ctx = await getUserContext();
        if (ctx?.displayName) setProfileName(ctx.displayName);
        if (ctx?.role) setProfileRole(ctx.role);
        if (ctx?.orgType) setOrgType(ctx.orgType as OrgType);

        if (ctx?.orgId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", ctx.orgId)
            .maybeSingle();

          setOrgName((org as any)?.name ?? "Organizzazione");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const notif = await getNotificationCount(user.id);
          setNotificationCount(notif || 0);
        }
      } catch (error) {
        console.error("MainLayout loadHeader error:", error);
      }
    };

    loadHeader();
  }, [userRole, router.asPath]);

  const initials = useMemo(() => {
    const parts = (profileName || "Utente")
      .split(" ")
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profileName]);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/equipment", label: "Macchine", icon: Factory },
    { href: "/documents", label: "Documenti", icon: FileText },
    { href: "/work-orders", label: "Ordini di lavoro", icon: ClipboardList },
    { href: "/checklists/templates", label: "Checklist", icon: CheckSquare },
    { href: "/qr", label: "Scanner QR", icon: QrCode },
    { href: "/analytics", label: "Analisi", icon: BarChart3, roles: ["admin", "supervisor"] },
    { href: "/compliance", label: "Compliance", icon: ShieldCheck },

    { href: "/plants", label: "Stabilimenti", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["customer"] },
    { href: "/users", label: "Utenti", icon: Users, roles: ["admin", "supervisor"] },

    { href: "/customers", label: "Clienti", icon: Building2, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },
    { href: "/assignments", label: "Assegnazioni", icon: Layers3, roles: ["admin", "supervisor"], orgTypes: ["manufacturer"] },

    { href: "/settings/organization", label: "Organizzazione attiva", icon: Package },
    { href: "/settings", label: "Impostazioni", icon: Settings },
  ];

  const filteredNavItems = navItems.filter((item) => {
    const roleOk = !item.roles || item.roles.includes(profileRole);
    const orgOk = !item.orgTypes || (orgType ? item.orgTypes.includes(orgType) : true);
    return roleOk && orgOk;
  });

  const mainItems = filteredNavItems.filter(
    (item) => !["/customers", "/assignments", "/users", "/settings", "/settings/organization"].includes(item.href)
  );
  const managementItems = filteredNavItems.filter(
    (item) => ["/customers", "/assignments", "/users"].includes(item.href)
  );
  const settingsItems = filteredNavItems.filter(
    (item) => ["/settings/organization", "/settings"].includes(item.href)
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (href: string) =>
    router.pathname === href || (href !== "/dashboard" && router.pathname.startsWith(href));

  const NavLink = ({ href, label, icon: Icon }: NavItem) => (
    <Link
      href={href}
      onClick={() => setSidebarOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-all",
        isActive(href)
          ? "bg-orange-500 text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.9)]"
          : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  const SideContent = () => (
    <div className="flex h-full flex-col bg-[#18273d] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 shadow-lg">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[30px] leading-none font-bold tracking-tight">MACHINA</div>
            <div className="truncate text-sm text-slate-300">
              {orgType === "manufacturer" ? "Costruttore" : orgType === "customer" ? "Utilizzatore finale" : "Piattaforma"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl bg-slate-800/70 p-3">
          <OrganizationSwitcher />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        <div className="space-y-2">
          {mainItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {managementItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Gestione
            </div>
            {managementItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        )}

        {settingsItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Sistema
            </div>
            {settingsItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-800/80 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{profileName}</div>
            <div className="truncate text-sm text-slate-300">
              {orgName} · <span className="capitalize">{profileRole}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Esci"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#091733] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-white/10 lg:block">
          <SideContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#132542]/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-xl p-2 text-slate-200 transition hover:bg-white/10 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <div className="text-lg font-semibold">Dashboard</div>
                  <div className="text-xs text-slate-300">
                    {orgName} · {orgType === "manufacturer" ? "Costruttore" : orgType === "customer" ? "Customer" : "Contesto"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="relative rounded-xl p-2 text-slate-200 transition hover:bg-white/10">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full bg-orange-500 px-1 text-[10px] text-white hover:bg-orange-500">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </Badge>
                  )}
                </button>

                <div className="hidden items-center gap-3 rounded-2xl bg-white/5 px-3 py-2 md:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[180px] truncate text-sm font-semibold">{profileName}</div>
                    <div className="text-xs text-slate-300 capitalize">{profileRole}</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 bg-[#07152f]">{children}</main>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">
            <button
              className="absolute right-3 top-3 z-10 rounded-xl bg-white/10 p-2 text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SideContent />
          </div>
        </div>
      )}
    </div>
  );
}

export default MainLayout;
