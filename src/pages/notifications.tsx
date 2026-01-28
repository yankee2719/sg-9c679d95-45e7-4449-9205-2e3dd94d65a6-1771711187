import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  ClipboardCheck, 
  AlertTriangle, 
  Clock, 
  Settings as SettingsIcon,
  Trash2
} from "lucide-react";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "task" | "overdue" | "checklist" | "system" | "reminder";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  
  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "task",
      title: "New Task Assigned",
      message: 'You have been assigned to "Daily Inspection - CNC Lathe"',
      timestamp: "1 hours ago",
      isRead: false
    },
    {
      id: "2",
      type: "overdue",
      title: "Task Overdue",
      message: 'Task "Overdue Inspection - Welding Cell" is past due date',
      timestamp: "2 hours ago",
      isRead: false
    },
    {
      id: "3",
      type: "checklist",
      title: "Checklist Pending Review",
      message: "A completed checklist requires your approval",
      timestamp: "1 days ago",
      isRead: true
    },
    {
      id: "4",
      type: "system",
      title: "System Update",
      message: "System maintenance scheduled for this weekend",
      timestamp: "2 days ago",
      isRead: false
    },
    {
      id: "5",
      type: "reminder",
      title: "Reminder",
      message: "Weekly maintenance for CNC Mill is due tomorrow",
      timestamp: "4 hours ago",
      isRead: false
    }
  ]);

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

      const profile = await authService.getUserProfile(session.user.id);
      const role = await userService.getUserRole(session.user.id);
      
      setUserName(profile?.full_name || session.user.email || "User");
      setUserRole(role as string);
    } catch (error) {
      console.error("Error loading data:", error);
      router.push("/login");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task":
        return <ClipboardCheck className="h-5 w-5 text-blue-400" />;
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "checklist":
        return <ClipboardCheck className="h-5 w-5 text-purple-400" />;
      case "system":
        return <SettingsIcon className="h-5 w-5 text-slate-400" />;
      case "reminder":
        return <Clock className="h-5 w-5 text-amber-400" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-blue-500/10";
      case "overdue":
        return "bg-red-500/10";
      case "checklist":
        return "bg-purple-500/10";
      case "system":
        return "bg-slate-500/10";
      case "reminder":
        return "bg-amber-500/10";
      default:
        return "bg-slate-500/10";
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
    toast({
      title: "✅ Marked as read",
      description: "Notification has been marked as read",
    });
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
    toast({
      title: "🗑️ Deleted",
      description: "Notification has been deleted",
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notif.isRead;
    return notif.type === activeTab;
  });

  if (!userRole) {
    return null;
  }

  return (
    <MainLayout userRole={userRole as any} userName={userName}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-slate-400">
            Stay updated with your tasks and system alerts
          </p>
        </div>

        {/* Tabs Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className={
              activeTab === "all"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            All
          </Button>
          <Button
            variant={activeTab === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("unread")}
            className={
              activeTab === "unread"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={activeTab === "task" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("task")}
            className={
              activeTab === "task"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            Assigned
          </Button>
          <Button
            variant={activeTab === "overdue" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("overdue")}
            className={
              activeTab === "overdue"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            Overdue
          </Button>
          <Button
            variant={activeTab === "reminder" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("reminder")}
            className={
              activeTab === "reminder"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            Reminders
          </Button>
          <Button
            variant={activeTab === "system" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("system")}
            className={
              activeTab === "system"
                ? "bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl"
                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl"
            }
          >
            System
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="rounded-2xl border-slate-700/50 bg-slate-800/30">
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No notifications found</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`rounded-2xl border-slate-700/50 transition-all hover:border-slate-600 ${
                  notification.isRead ? "bg-slate-800/30" : "bg-slate-800/50"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${getNotificationBgColor(
                        notification.type
                      )} flex items-center justify-center flex-shrink-0`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500">
                            {notification.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-[#FF6B35] hover:text-[#FF8C61] hover:bg-orange-500/10 rounded-lg"
                        >
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}