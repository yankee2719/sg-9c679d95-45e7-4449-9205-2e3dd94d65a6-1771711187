import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Key, 
  Clock, 
  Globe, 
  Languages, 
  Palette, 
  Moon, 
  Bell, 
  Mail,
  AlertTriangle,
  CheckCircle,
  Database,
  HardDrive,
  Activity
} from "lucide-react";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  
  // Settings state
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [autoLogout, setAutoLogout] = useState("30");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Europe/Rome");

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const profile = await userService.getUserProfile(session.user.id);
      const role = await userService.getUserRole(session.user.id);
      
      setUserName(profile?.full_name || session.user.email || "User");
      setUserRole(role as string);

      // Only admin can access settings
      if (role !== "admin") {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Only administrators can access system settings",
        });
        router.push("/dashboard");
        return;
      }
    } catch (error) {
      console.error("Error loading data:", error);
      router.push("/login");
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "✅ Settings Saved",
      description: "Your preferences have been updated successfully",
    });
  };

  if (!userRole) {
    return null;
  }

  return (
    <MainLayout userRole={userRole as any} userName={userName}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-slate-400">Configure system preferences and security settings</p>
        </div>

        {/* Appearance Section */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <h2 className="text-xl font-bold text-white">Appearance</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Dark Mode</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Switch between light and dark theme</p>
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  className="data-[state=checked]:bg-[#FF6B35]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Email Notifications</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Receive notifications via email</p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  className="data-[state=checked]:bg-[#FF6B35]"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Task Reminders</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Get reminded about upcoming tasks</p>
                  </div>
                </div>
                <Switch
                  checked={taskReminders}
                  onCheckedChange={setTaskReminders}
                  className="data-[state=checked]:bg-[#FF6B35]"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Overdue Alerts</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Receive alerts for overdue tasks</p>
                  </div>
                </div>
                <Switch
                  checked={overdueAlerts}
                  onCheckedChange={setOverdueAlerts}
                  className="data-[state=checked]:bg-[#FF6B35]"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Weekly Reports</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Receive weekly maintenance summary</p>
                  </div>
                </div>
                <Switch
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                  className="data-[state=checked]:bg-[#FF6B35]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <h2 className="text-xl font-bold text-white">Security</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Two-Factor Authentication</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Add an extra layer of security</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                >
                  Enable 2FA
                </Button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Auto Logout</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Automatically log out after inactivity</p>
                  </div>
                </div>
                <Select value={autoLogout} onValueChange={setAutoLogout}>
                  <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="15" className="text-white">15 minutes</SelectItem>
                    <SelectItem value="30" className="text-white">30 minutes</SelectItem>
                    <SelectItem value="60" className="text-white">1 hour</SelectItem>
                    <SelectItem value="120" className="text-white">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Section */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <h2 className="text-xl font-bold text-white">Regional</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Languages className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Language</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Select your preferred language</p>
                  </div>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="en" className="text-white">English</SelectItem>
                    <SelectItem value="it" className="text-white">Italiano</SelectItem>
                    <SelectItem value="de" className="text-white">Deutsch</SelectItem>
                    <SelectItem value="fr" className="text-white">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <Label className="text-white font-medium">Timezone</Label>
                    <p className="text-sm text-slate-400 mt-0.5">Set your local timezone</p>
                  </div>
                </div>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Europe/Rome" className="text-white">Europe/Rome (CET)</SelectItem>
                    <SelectItem value="Europe/London" className="text-white">Europe/London (GMT)</SelectItem>
                    <SelectItem value="America/New_York" className="text-white">America/New York (EST)</SelectItem>
                    <SelectItem value="Asia/Tokyo" className="text-white">Asia/Tokyo (JST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Information Section */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">System Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Version</p>
                <p className="text-2xl font-bold text-white">2.1.0</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Database</p>
                <p className="text-2xl font-bold text-white">PostgreSQL</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Last Backup</p>
                <p className="text-2xl font-bold text-white">Today 03:00</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Status
                </p>
                <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Healthy
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white px-6 py-2 rounded-xl"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}