import { ReactNode, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
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
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "supervisor" | "technician";
}

export function MainLayout({ children, userRole = "technician" }: MainLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("U");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) return;

      const profile = await userService.getUserProfile(session.user.id);
      const name = profile?.full_name || session.user.email || "User";
      setUserName(name);

      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      setUserInitials(initials);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const navigation = useMemo(() => {
    const items = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Equipment", href: "/equipment", icon: SettingsIcon },
      { name: "Maintenance", href: "/maintenance", icon: Wrench, badge: 1 },
      { name: "Checklists", href: "/checklists", icon: ClipboardCheck },
      { name: "Analytics", href: "/analytics/checklist-executions", icon: BarChart3 },
    ];

    // Add Users menu for admin only
    if (userRole === "admin") {
      items.push({
        name: "Users",
        href: "/admin/users",
        icon: Users2,
      });
    }

    // Add Notifications for all users
    items.push({
      name: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: 4,
    });

    // Add Settings menu for admin only
    if (userRole === "admin") {
      items.push({
        name: "Settings",
        href: "/settings",
        icon: Settings2,
      });
    }

    return items;
  }, [userRole]);

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