import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import {
    notificationService,
    type Notification,
    type NotificationType,
} from "@/services/notificationService";
import {
    Bell, ClipboardList, AlertTriangle, Clock, Wrench,
    CheckCircle2, Trash2, CheckCheck, BellOff, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// CONFIG
// =============================================================================

const typeConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    maintenance_due: { label: "Manutenzione", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    maintenance_overdue: { label: "Scaduta", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500/10" },
    equipment_status: { label: "Macchina", icon: Wrench, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    checklist_assigned: { label: "Checklist", icon: ClipboardList, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    checklist_completed: { label: "Checklist", icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
    wo_assigned: { label: "WO Assegnato", icon: User, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
    wo_completed: { label: "WO Completato", icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
    system: { label: "Sistema", icon: Bell, color: "text-gray-500", bgColor: "bg-gray-500/10" },
};

function getEntityRoute(n: Notification): string | null {
    if (!n.related_entity_type || !n.related_entity_id) return null;
    switch (n.related_entity_type) {
        case "work_order": return `/work-orders/${n.related_entity_id}`;
        case "maintenance_plan": return `/maintenance/${n.related_entity_id}`;
        case "machine": return `/equipment/${n.related_entity_id}`;
        case "checklist_execution": return `/checklist/${n.related_entity_id}`;
        default: return null;
    }
}

function formatRelative(d: string): string {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1) return "Ora";
    if (mins < 60) return `${mins}m fa`;
    if (hrs < 24) return `${hrs}h fa`;
    if (days < 7) return `${days}g fa`;
    return new Date(d).toLocaleDateString("it-IT");
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function NotificationsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState<"all" | "unread" | NotificationType>("all");

    // =========================================================================
    // LOAD
    // =========================================================================

    const loadNotifications = useCallback(async () => {
        const result = await notificationService.getMyNotifications({ limit: 100 });
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
    }, []);

    useEffect(() => {
        const init = async () => {
            const ctx = await getUserContext();
            if (!ctx) { router.push("/login"); return; }
            setUserRole(ctx.role as any);
            await loadNotifications();
            setLoading(false);
        };
        init();
    }, [router, loadNotifications]);

    // Realtime
    useEffect(() => {
        let channel: any = null;
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            channel = notificationService.subscribeToMyNotifications(user.id, (newNotif) => {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
        };
        setup();
        return () => { if (channel) notificationService.unsubscribe(channel); };
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleClick = async (n: Notification) => {
        if (!n.is_read) {
            await notificationService.markAsRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        const route = getEntityRoute(n);
        if (route) router.push(route);
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
        setUnreadCount(0);
        toast({ title: "Tutte lette" });
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const n = notifications.find(x => x.id === id);
        await notificationService.deleteNotification(id);
        setNotifications(prev => prev.filter(x => x.id !== id));
        if (n && !n.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleDeleteAllRead = async () => {
        await notificationService.deleteAllRead();
        setNotifications(prev => prev.filter(x => !x.is_read));
        toast({ title: "Notifiche lette eliminate" });
    };

    // =========================================================================
    // FILTER
    // =========================================================================

    const filtered = notifications.filter(n => {
        if (activeFilter === "all") return true;
        if (activeFilter === "unread") return !n.is_read;
        return n.type === activeFilter;
    });

    const filterButtons: { key: string; label: string; count?: number }[] = [
        { key: "all", label: "Tutte" },
        { key: "unread", label: "Non lette", count: unreadCount },
        { key: "maintenance_overdue", label: "Scadute" },
        { key: "wo_assigned", label: "Assegnati" },
        { key: "checklist_completed", label: "Checklist" },
        { key: "system", label: "Sistema" },
    ];

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <div className="space-y-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Notifiche</h1>
                        <p className="text-muted-foreground mt-1">
                            {unreadCount > 0 ? `${unreadCount} non lette` : "Tutto aggiornato"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                                <CheckCheck className="w-4 h-4 mr-1" /> Segna tutte lette
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleDeleteAllRead} title="Elimina lette">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    {filterButtons.map(fb => (
                        <Button key={fb.key} size="sm"
                            variant={activeFilter === fb.key ? "default" : "outline"}
                            className={activeFilter === fb.key ? "bg-[#FF6B35] hover:bg-[#e55a2b] text-white rounded-xl" : "rounded-xl"}
                            onClick={() => setActiveFilter(fb.key as any)}>
                            {fb.label}
                            {fb.count !== undefined && fb.count > 0 && (
                                <Badge className="ml-1.5 h-5 min-w-[20px] p-0 flex items-center justify-center rounded-full bg-white/20 text-current text-xs">{fb.count}</Badge>
                            )}
                        </Button>
                    ))}
                </div>

                {/* List */}
                <div className="space-y-2">
                    {filtered.length === 0 ? (
                        <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                            <BellOff className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-foreground mb-1">Nessuna notifica</h3>
                            <p className="text-muted-foreground text-sm">Le notifiche appariranno qui automaticamente</p>
                        </Card>
                    ) : (
                        filtered.map(n => {
                            const config = typeConfig[n.type] || typeConfig.system;
                            const Icon = config.icon;
                            const route = getEntityRoute(n);

                            return (
                                <Card key={n.id}
                                    className={`rounded-2xl border-0 shadow-sm transition-all group ${route ? "cursor-pointer hover:shadow-md" : ""} ${n.is_read ? "bg-card opacity-70" : "bg-card border-l-4 border-l-[#FF6B35]"}`}
                                    onClick={() => handleClick(n)}>
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                                            <Icon className={`w-5 h-5 ${config.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-semibold truncate ${n.is_read ? "text-foreground" : "text-foreground"}`}>{n.title}</h3>
                                                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#FF6B35] shrink-0" />}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => handleDelete(e, n.id)}>
                                                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="mt-1.5 text-xs">{config.label}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </MainLayout>
    );
}