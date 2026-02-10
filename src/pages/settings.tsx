import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
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
    Activity
} from "lucide-react";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [userRole, setUserRole] = useState < "admin" | "supervisor" | "technician" > ("admin");
    const [userName, setUserName] = useState < string > ("");
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
    });

    const [darkMode, setDarkMode] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [taskReminders, setTaskReminders] = useState(true);
    const [overdueAlerts, setOverdueAlerts] = useState(true);
    const [weeklyReports, setWeeklyReports] = useState(false);
    const [autoLogout, setAutoLogout] = useState("30");
    const [language, setLanguage] = useState("en");
    const [timezone, setTimezone] = useState("Europe/Rome");

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/login");
                    return;
                }

                const profile = await userService.getUserById(user.id);
                if (!profile) {
                    router.push("/login");
                    return;
                }
                setUserRole(profile.role as "admin" | "supervisor" | "technician");
                setUserName(profile.full_name || profile.email || "User");
                setFormData({
                    full_name: profile.full_name || "",
                    email: profile.email || "",
                });
            } catch (error) {
                console.error("Error loading user data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [router]);

    const handleSaveSettings = () => {
        toast({
            title: `✅ ${t("settings.saved")}`,
            description: t("settings.savedDesc"),
        });
    };

    // Get translated texts
    const pageTitle = t("settings.title");
    const pageSubtitle = t("settings.subtitle");
    const appearanceTitle = t("settings.appearance");
    const darkModeLabel = t("settings.darkMode");
    const darkModeDesc = t("settings.darkModeDesc");
    const notificationsTitle = t("settings.notifications");
    const emailNotifLabel = t("settings.emailNotifications");
    const emailNotifDesc = t("settings.emailNotificationsDesc");
    const taskRemindersLabel = t("settings.taskReminders");
    const taskRemindersDesc = t("settings.taskRemindersDesc");
    const overdueAlertsLabel = t("settings.overdueAlerts");
    const overdueAlertsDesc = t("settings.overdueAlertsDesc");
    const weeklyReportsLabel = t("settings.weeklyReports");
    const weeklyReportsDesc = t("settings.weeklyReportsDesc");
    const securityTitle = t("settings.security");
    const twoFactorLabel = t("settings.twoFactor");
    const twoFactorDesc = t("settings.twoFactorDesc");
    const enable2FAText = t("settings.enable2FA");
    const autoLogoutLabel = t("settings.autoLogout");
    const autoLogoutDesc = t("settings.autoLogoutDesc");
    const regionalTitle = t("settings.regional");
    const languageLabel = t("settings.language");
    const languageDesc = t("settings.languageDesc");
    const timezoneLabel = t("settings.timezone");
    const timezoneDesc = t("settings.timezoneDesc");
    const systemInfoTitle = t("settings.systemInfo");
    const versionLabel = t("settings.version");
    const databaseLabel = t("settings.database");
    const lastBackupLabel = t("settings.lastBackup");
    const statusLabel = t("settings.status");
    const healthyText = t("settings.healthy");
    const saveSettingsText = t("settings.saveSettings");

    if (!userRole || loading) {
        return null;
    }

    return (
        <MainLayout userRole={userRole}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{pageTitle}</h1>
                    <p className="text-slate-400">{pageSubtitle}</p>
                </div>

                {/* Appearance Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#fb923c]/10 flex items-center justify-center">
                                <Palette className="h-5 w-5 text-[#fb923c]" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{appearanceTitle}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Moon className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{darkModeLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{darkModeDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={darkMode}
                                    onCheckedChange={setDarkMode}
                                    className="data-[state=checked]:bg-[#fb923c]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#fb923c]/10 flex items-center justify-center">
                                <Bell className="h-5 w-5 text-[#fb923c]" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{notificationsTitle}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{emailNotifLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{emailNotifDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={emailNotifications}
                                    onCheckedChange={setEmailNotifications}
                                    className="data-[state=checked]:bg-[#fb923c]"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{taskRemindersLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{taskRemindersDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={taskReminders}
                                    onCheckedChange={setTaskReminders}
                                    className="data-[state=checked]:bg-[#fb923c]"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{overdueAlertsLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{overdueAlertsDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={overdueAlerts}
                                    onCheckedChange={setOverdueAlerts}
                                    className="data-[state=checked]:bg-[#fb923c]"
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{weeklyReportsLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{weeklyReportsDesc}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={weeklyReports}
                                    onCheckedChange={setWeeklyReports}
                                    className="data-[state=checked]:bg-[#fb923c]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#fb923c]/10 flex items-center justify-center">
                                <Shield className="h-5 w-5 text-[#fb923c]" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{securityTitle}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Key className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{twoFactorLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{twoFactorDesc}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                                >
                                    {enable2FAText}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{autoLogoutLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{autoLogoutDesc}</p>
                                    </div>
                                </div>
                                <Select value={autoLogout} onValueChange={setAutoLogout}>
                                    <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="15" className="text-white">15 {t("common.minutes")}</SelectItem>
                                        <SelectItem value="30" className="text-white">30 {t("common.minutes")}</SelectItem>
                                        <SelectItem value="60" className="text-white">1 {t("common.hour")}</SelectItem>
                                        <SelectItem value="120" className="text-white">2 {t("common.hours")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Regional Section */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#fb923c]/10 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-[#fb923c]" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{regionalTitle}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Languages className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{languageLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{languageDesc}</p>
                                    </div>
                                </div>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="en" className="text-white">English</SelectItem>
                                        <SelectItem value="it" className="text-white">Italiano</SelectItem>
                                        <SelectItem value="fr" className="text-white">Français</SelectItem>
                                        <SelectItem value="es" className="text-white">Español</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <Label className="text-white font-medium">{timezoneLabel}</Label>
                                        <p className="text-sm text-slate-400 mt-0.5">{timezoneDesc}</p>
                                    </div>
                                </div>
                                <Select value={timezone} onValueChange={setTimezone}>
                                    <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
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
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Database className="h-5 w-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white">{systemInfoTitle}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{versionLabel}</p>
                                <p className="text-2xl font-bold text-white">2.1.0</p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{databaseLabel}</p>
                                <p className="text-2xl font-bold text-white">PostgreSQL</p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{lastBackupLabel}</p>
                                <p className="text-2xl font-bold text-white">Today 03:00</p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {statusLabel}
                                </p>
                                <p className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    {healthyText}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button
                        onClick={handleSaveSettings}
                        className="bg-[#fb923c] hover:bg-[#f97316] text-white px-6 py-2"
                    >
                        {saveSettingsText}
                    </Button>
                </div>
            </div>
        </MainLayout>
    );
}