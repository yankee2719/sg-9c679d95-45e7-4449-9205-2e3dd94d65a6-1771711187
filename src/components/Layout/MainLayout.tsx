import { ReactNode } from "react";
import { useRouter } from "next/router";
import { 
  LayoutDashboard, 
  Wrench, 
  ClipboardList,
  Clock,
  FileText,
  BarChart3,
  Bell,
  LogOut,
  ChevronLeft,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { useTheme } from "@/contexts/ThemeProvider";

interface MainLayoutProps {
  children: ReactNode;
  userRole?: "admin" | "supervisor" | "technician";
  userName?: string;
}

export function MainLayout({ children, userRole = "admin", userName = "Marco Rossi" }: MainLayoutProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: router.pathname === "/dashboard" },
    { name: "Equipment", href: "/equipment", icon: Settings, active: router.pathname.startsWith("/equipment") },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, active: router.pathname.startsWith("/maintenance"), badge: 1 },
    { name: "Checklists", href: "/checklists", icon: ClipboardList, active: router.pathname.startsWith("/checklist") },
    { name: "History", href: "/maintenance", icon: Clock, active: false },
    { name: "Documents", href: "/equipment", icon: FileText, active: false },
    { name: "Reports", href: "/analytics/checklist-executions", icon: BarChart3, active: router.pathname.startsWith("/analytics") },
    { name: "Notifications", href: "/maintenance", icon: Bell, active: false, badge: 4 },
  ];

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrator",
      supervisor: "Supervisor",
      technician: "Technician"
    };
    return labels[role] || role;
  };

  return (
    <div className="flex h-screen bg-[#1E293B] text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800/50 flex flex-col">
        {/* Brand */}
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
            className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative group ${
                  item.active 
                    ? "bg-[#FF6B35]/15 text-[#FF6B35]" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${item.active ? "text-[#FF6B35]" : "text-slate-400 group-hover:text-white"}`} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <Badge className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold border-0">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
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
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#1E293B]">
        <div className="max-w-[1400px] mx-auto min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-[#1E293B]/95 backdrop-blur-lg border-b border-slate-700/50">
            <div className="flex items-center justify-between px-8 py-5">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {navigation.find(n => n.active)?.name || "Dashboard"}
              </h2>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-slate-800/50 text-slate-400 hover:text-white rounded-xl"
                >
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold border-2 border-[#1E293B]" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}