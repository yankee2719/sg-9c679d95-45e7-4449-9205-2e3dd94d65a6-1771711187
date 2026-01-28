import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { 
  LayoutDashboard, 
  Settings as SettingsIcon,
  Wrench,
  ClipboardCheck,
  History,
  FileText,
  BarChart3,
  Users2,
  Bell,
  LogOut,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";

interface MainLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "supervisor" | "technician";
}

export function MainLayout({ children, userRole: propUserRole }: MainLayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");
  const [userRole, setUserRole] = useState<string>(propUserRole || "technician");

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const profile = await userService.getUserProfile(session.user.id);
      
      setUserName(profile?.full_name || session.user.email || "User");
      setUserRole(profile?.role || propUserRole || "technician");
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      supervisor: "Supervisor",
      technician: "Technician"
    };
    return labels[role] || "User";
  };

  // Navigation items with RBAC
  const navigationBase = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: false },
    { name: "Equipment", href: "/equipment", icon: SettingsIcon, active: false },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, active: false, badge: 1 },
    { name: "Checklists", href: "/checklists", icon: ClipboardCheck, active: false },
    { name: "History", href: "/history", icon: History, active: false },
    { name: "Documents", href: "/documents", icon: FileText, active: false },
    { name: "Reports", href: "/reports", icon: BarChart3, active: false },
  ];

  // Admin-only items
  const adminItems = [
    { name: "Users", href: "/admin/users", icon: Users2, active: false },
  ];

  // Common items for all roles
  const commonItems = [
    { name: "Notifications", href: "/notifications", icon: Bell, active: false, badge: 4 },
  ];

  // Settings - admin only
  const settingsItems = [
    { name: "Settings", href: "/settings", icon: SettingsIcon, active: false },
  ];

  // Build final navigation array based on role
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: false },
    { name: "Equipment", href: "/equipment", icon: SettingsIcon, active: false },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, active: false, badge: 1 },
    { name: "Checklists", href: "/checklists", icon: ClipboardCheck, active: false },
    { name: "History", href: "/history", icon: History, active: false },
    { name: "Documents", href: "/documents", icon: FileText, active: false },
    { name: "Reports", href: "/reports", icon: BarChart3, active: false },
    ...(userRole === "admin" ? [
      { name: "Users", href: "/admin/users", icon: Users2, active: false },
    ] : []),
    { name: "Notifications", href: "/notifications", icon: Bell, active: false, badge: 4 },
  ].map(item => ({
    ...item,
    active: router.pathname.startsWith(item.href)
  }));

  return (
    <div className="flex h-screen bg-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">MaintPro</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  item.active 
                    ? "bg-[#FF6B35]/15 text-[#FF6B35]" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  item.active ? "text-[#FF6B35]" : "text-slate-400 group-hover:text-white"
                }`} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.badge && (
                  <Badge className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white border-0 text-xs font-bold">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/30 mb-2">
            <Avatar className="w-10 h-10 border-2 border-slate-700">
              <AvatarFallback className="bg-[#3B82F6] text-white font-bold text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400 font-medium">{getRoleLabel(userRole)}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="container mx-auto max-w-7xl" style={{ padding: "2rem" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}