import { ReactNode } from "react";
import { useRouter } from "next/router";
import { 
  LayoutDashboard, 
  QrCode, 
  Wrench, 
  ClipboardList,
  Bell,
  Moon,
  Sun,
  LogOut,
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
}

export function MainLayout({ children, userRole = "admin" }: MainLayoutProps) {
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
    { name: "Scanner QR", href: "/scanner", icon: QrCode, active: router.pathname === "/scanner" },
    { name: "Equipaggiamenti", href: "/equipment", icon: Wrench, active: router.pathname.startsWith("/equipment") },
    { name: "Attività", href: "/maintenance", icon: ClipboardList, active: router.pathname.startsWith("/maintenance") },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Maint Ops</h1>
              <p className="text-xs text-slate-400 font-medium">Sistema Manutenzione</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 mx-4 mt-4 mb-2 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-slate-700">
              <AvatarFallback className="bg-slate-700 text-blue-400 font-bold text-sm">MR</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-white">Marco Rossi</p>
              <p className="text-xs text-blue-400 font-medium capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`sidebar-item w-full group relative ${item.active ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
              >
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                )}
                <Icon className={`h-5 w-5 ${item.active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="font-medium">{item.name}</span>
                {item.active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/50 space-y-2 bg-slate-900/30">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800/50"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5" />
                <span>Tema Chiaro</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                <span>Tema Scuro</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Esci</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
            <div className="flex items-center justify-between px-8 py-5">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {navigation.find(n => n.active)?.name || "Dashboard"}
              </h2>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative hover:bg-slate-800/50 text-slate-400 hover:text-white">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute top-2 right-2 w-2 h-2 p-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
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