import { ReactNode, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Users2,
  Bell,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Home,
  Package,
  ClipboardList,
  QrCode,
  Settings,
  Users,
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "supervisor" | "technician";
}

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("U");
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await userService.getUserById(user.id);
          setUserName(profile.full_name || profile.email || "User");
          setUserInitials(getInitials(profile.full_name || profile.email || "U"));
          setUserRole(profile.role as "admin" | "supervisor" | "technician");
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/equipment", label: "Equipaggiamenti", icon: Package },
    { href: "/maintenance", label: "Manutenzioni", icon: Wrench },
    { href: "/checklists", label: "Checklist", icon: ClipboardList },
    { href: "/scanner", label: "Scanner QR", icon: QrCode },
    { href: "/notifications", label: "Notifiche", icon: Bell },
    { href: "/settings", label: "Impostazioni", icon: Settings },
  ];

  const adminMenuItems = [
    { href: "/admin/users", label: "Utenti", icon: Users },
    { href: "/analytics/checklist-executions", label: "Analitiche", icon: BarChart3 },
  ];

  const navigation = useMemo(() => {
    const items = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Equipaggiamenti", href: "/equipment", icon: SettingsIcon },
      { name: "Manutenzioni", href: "/maintenance", icon: Wrench, badge: 1 },
      { name: "Checklist", href: "/checklists", icon: ClipboardCheck },
      { name: "Analitiche", href: "/analytics/checklist-executions", icon: BarChart3 },
    ];

    // Add Users menu for admin only
    if (userRole === "admin") {
      items.push({
        name: "Utenti",
        href: "/admin/users",
        icon: Users2,
      });
    }

    // Add Notifications for all users
    items.push({
      name: "Notifiche",
      href: "/notifications",
      icon: Bell,
      badge: 4,
    });

    // Add Settings menu for admin only
    if (userRole === "admin") {
      items.push({
        name: "Impostazioni",
        href: "/settings",
        icon: Settings2,
      });
    }

    return items;
  }, [userRole]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return router.pathname === href;
    // Handle Analytics sub-paths matching
    if (href === "/analytics/checklist-executions" && router.pathname.startsWith("/analytics")) return true;
    return router.pathname.startsWith(href);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      supervisor: "Supervisor",
      technician: "Technician",
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0F172A] border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MaintPro</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#0F172A] border-r border-slate-800
          ${sidebarCollapsed ? "w-20" : "w-64"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">MaintPro</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        active
                          ? "bg-[#FF6B35]/15 text-[#FF6B35] font-medium"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? "text-[#FF6B35]" : ""}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-[#FF6B35] text-white">
                <AvatarFallback className="bg-[#FF6B35] text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400">{getRoleLabel(userRole)}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full mt-3 justify-start gap-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        } pt-16 lg:pt-0`}
      >
        <div className="p-6" style={{ minHeight: "100vh", paddingBottom: "2rem" }}>
          {children}
        </div>
      </main>
    </div>
  );
}