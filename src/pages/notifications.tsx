import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { notificationService, type Notification, type NotificationType } from "@/services/notificationService";
import { Bell, ClipboardList, AlertTriangle, Clock, Wrench, CheckCircle2, Trash2, CheckCheck, BellOff, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
    it: {
        pageTitle: "Notifiche",
        allCaughtUp: "Tutto aggiornato",
        unreadSuffix: "non lette",
        markAllRead: "Segna tutte lette",
        deleteRead: "Elimina lette",
        emptyTitle: "Nessuna notifica",
        emptyDescription: "Le notifiche appariranno qui quando ci saranno aggiornamenti.",
        newBadge: "Nuova",
        toastAllRead: "Tutte lette",
        toastReadDeleted: "Notifiche lette eliminate",
        filters: {
            all: "Tutte",
            unread: "Non lette",
            overdue: "Scadute",
            assigned: "Assegnati",
            checklists: "Checklist",
            system: "Sistema",
        },
        labels: {
            maintenance_due: "Manutenzione",
            maintenance_overdue: "Scaduta",
            equipment_status: "Macchina",
            checklist_assigned: "Checklist",
            checklist_completed: "Checklist",
            wo_assigned: "WO assegnato",
            wo_completed: "WO completato",
            system: "Sistema",
        },
        relative: {
            now: "Ora",
            minutes: "m fa",
            hours: "h fa",
            days: "g fa",
            locale: "it-IT",
        },
        deleteAria: "Elimina notifica",
    },
    en: {
        pageTitle: "Notifications",
        allCaughtUp: "All caught up",
        unreadSuffix: "unread",
        markAllRead: "Mark all as read",
        deleteRead: "Delete read",
        emptyTitle: "No notifications",
        emptyDescription: "Notifications will appear here when updates arrive.",
        newBadge: "New",
        toastAllRead: "All notifications marked as read",
        toastReadDeleted: "Read notifications deleted",
        filters: {
            all: "All",
            unread: "Unread",
            overdue: "Overdue",
            assigned: "Assigned",
            checklists: "Checklists",
            system: "System",
        },
        labels: {
            maintenance_due: "Maintenance",
            maintenance_overdue: "Overdue",
            equipment_status: "Machine",
            checklist_assigned: "Checklist",
            checklist_completed: "Checklist",
            wo_assigned: "WO assigned",
            wo_completed: "WO completed",
            system: "System",
        },
        relative: {
            now: "Now",
            minutes: "m ago",
            hours: "h ago",
            days: "d ago",
            locale: "en-GB",
        },
        deleteAria: "Delete notification",
    },
    fr: {
        pageTitle: "Notifications",
        allCaughtUp: "Tout est à jour",
        unreadSuffix: "non lues",
        markAllRead: "Tout marquer comme lu",
        deleteRead: "Supprimer les lues",
        emptyTitle: "Aucune notification",
        emptyDescription: "Les notifications apparaîtront ici lorsqu'il y aura des mises à jour.",
        newBadge: "Nouvelle",
        toastAllRead: "Toutes les notifications sont lues",
        toastReadDeleted: "Notifications lues supprimées",
        filters: {
            all: "Toutes",
            unread: "Non lues",
            overdue: "En retard",
            assigned: "Assignés",
            checklists: "Checklist",
            system: "Système",
        },
        labels: {
            maintenance_due: "Maintenance",
            maintenance_overdue: "En retard",
            equipment_status: "Machine",
            checklist_assigned: "Checklist",
            checklist_completed: "Checklist",
            wo_assigned: "OT assigné",
            wo_completed: "OT terminé",
            system: "Système",
        },
        relative: {
            now: "À l’instant",
            minutes: "min",
            hours: "h",
            days: "j",
            locale: "fr-FR",
        },
        deleteAria: "Supprimer la notification",
    },
    es: {
        pageTitle: "Notificaciones",
        allCaughtUp: "Todo al día",
        unreadSuffix: "sin leer",
        markAllRead: "Marcar todas como leídas",
        deleteRead: "Eliminar leídas",
        emptyTitle: "Sin notificaciones",
        emptyDescription: "Las notificaciones aparecerán aquí cuando haya actualizaciones.",
        newBadge: "Nueva",
        toastAllRead: "Todas las notificaciones marcadas como leídas",
        toastReadDeleted: "Notificaciones leídas eliminadas",
        filters: {
            all: "Todas",
            unread: "Sin leer",
            overdue: "Vencidas",
            assigned: "Asignadas",
            checklists: "Checklists",
            system: "Sistema",
        },
        labels: {
            maintenance_due: "Mantenimiento",
            maintenance_overdue: "Vencida",
            equipment_status: "Máquina",
            checklist_assigned: "Checklist",
            checklist_completed: "Checklist",
            wo_assigned: "OT asignada",
            wo_completed: "OT completada",
            system: "Sistema",
        },
        relative: {
            now: "Ahora",
            minutes: "m",
            hours: "h",
            days: "d",
            locale: "es-ES",
        },
        deleteAria: "Eliminar notificación",
    },
} as const;

function getEntityRoute(n: Notification): string | null {
    if (!n.related_entity_type || !n.related_entity_id) return null;
    switch (n.related_entity_type) {
        case "work_order":
            return `/work-orders/${n.related_entity_id}`;
        case "maintenance_plan":
            return `/maintenance/${n.related_entity_id}`;
        case "machine":
            return `/equipment/${n.related_entity_id}`;
        case "checklist_execution":
            return `/checklist/${n.related_entity_id}`;
        default:
            return null;
    }
}

export default function NotificationsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { language } = useLanguage();
    const text = useMemo(() => copy[language], [language]);

    const typeConfig: Record<string, { label: string; icon: any; chip: string }> = {
        maintenance_due: { label: text.labels.maintenance_due, icon: Clock, chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
        maintenance_overdue: { label: text.labels.maintenance_overdue, icon: AlertTriangle, chip: "bg-red-500/15 text-red-700 dark:text-red-300" },
        equipment_status: { label: text.labels.equipment_status, icon: Wrench, chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
        checklist_assigned: { label: text.labels.checklist_assigned, icon: ClipboardList, chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
        checklist_completed: { label: text.labels.checklist_completed, icon: CheckCircle2, chip: "bg-green-500/15 text-green-700 dark:text-green-300" },
        wo_assigned: { label: text.labels.wo_assigned, icon: User, chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" },
        wo_completed: { label: text.labels.wo_completed, icon: CheckCircle2, chip: "bg-green-500/15 text-green-700 dark:text-green-300" },
        system: { label: text.labels.system, icon: Bell, chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
    };

    const formatRelative = useCallback((d: string) => {
        const ms = Date.now() - new Date(d).getTime();
        const mins = Math.floor(ms / 60000);
        const hrs = Math.floor(ms / 3600000);
        const days = Math.floor(ms / 86400000);
        if (mins < 1) return text.relative.now;
        if (mins < 60) return `${mins}${text.relative.minutes}`;
        if (hrs < 24) return `${hrs}${text.relative.hours}`;
        if (days < 7) return `${days}${text.relative.days}`;
        return new Date(d).toLocaleDateString(text.relative.locale);
    }, [text.relative]);

    const [userRole, setUserRole] = useState < "admin" | "supervisor" | "technician" > ("technician");
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState < Notification[] > ([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState < "all" | "unread" | NotificationType > ("all");

    const loadNotifications = useCallback(async () => {
        const result = await notificationService.getMyNotifications({ limit: 100 });
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
    }, []);

    useEffect(() => {
        const init = async () => {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }
            setUserRole((ctx.role as any) ?? "technician");
            await loadNotifications();
            setLoading(false);
        };
        init();
    }, [router, loadNotifications]);

    useEffect(() => {
        let channel: any = null;
        const setup = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            channel = notificationService.subscribeToMyNotifications(user.id, (newNotif) => {
                setNotifications((prev) => [newNotif, ...prev]);
                setUnreadCount((prev) => prev + 1);
            });
        };
        setup();
        return () => {
            if (channel) notificationService.unsubscribe(channel);
        };
    }, []);

    const handleClick = async (n: Notification) => {
        if (!n.is_read) {
            await notificationService.markAsRead(n.id);
            setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        const route = getEntityRoute(n);
        if (route) router.push(route);
    };

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
        setUnreadCount(0);
        toast({ title: text.toastAllRead });
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const current = notifications.find((x) => x.id === id);
        await notificationService.deleteNotification(id);
        setNotifications((prev) => prev.filter((x) => x.id !== id));
        if (current && !current.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleDeleteAllRead = async () => {
        await notificationService.deleteAllRead();
        setNotifications((prev) => prev.filter((x) => !x.is_read));
        toast({ title: text.toastReadDeleted });
    };

    const filtered = notifications.filter((n) => {
        if (activeFilter === "all") return true;
        if (activeFilter === "unread") return !n.is_read;
        return n.type === activeFilter;
    });

    const filterButtons: { key: string; label: string; count?: number }[] = [
        { key: "all", label: text.filters.all },
        { key: "unread", label: text.filters.unread, count: unreadCount },
        { key: "maintenance_overdue", label: text.filters.overdue },
        { key: "wo_assigned", label: text.filters.assigned },
        { key: "checklist_completed", label: text.filters.checklists },
        { key: "system", label: text.filters.system },
    ];

    if (loading) return null;

    return (
        <MainLayout userRole={userRole}>
            <div className="mx-auto max-w-4xl space-y-6 px-5 py-6 lg:px-8 lg:py-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{text.pageTitle}</h1>
                        <p className="mt-1 text-muted-foreground">
                            {unreadCount > 0 ? `${unreadCount} ${text.unreadSuffix}` : text.allCaughtUp}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                                <CheckCheck className="mr-1 h-4 w-4" /> {text.markAllRead}
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleDeleteAllRead} title={text.deleteRead}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {filterButtons.map((fb) => (
                        <button
                            key={fb.key}
                            type="button"
                            onClick={() => setActiveFilter(fb.key as any)}
                            className={
                                activeFilter === fb.key
                                    ? "rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white"
                                    : "rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                            }
                        >
                            {fb.label}
                            {fb.count !== undefined && fb.count > 0 && (
                                <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/15">{fb.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {filtered.length === 0 ? (
                        <div className="surface-panel p-12 text-center">
                            <BellOff className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mb-1 text-lg font-bold text-foreground">{text.emptyTitle}</h3>
                            <p className="text-sm text-muted-foreground">{text.emptyDescription}</p>
                        </div>
                    ) : (
                        filtered.map((n) => {
                            const config = typeConfig[n.type] ?? typeConfig.system;
                            const Icon = config.icon || Bell;
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => handleClick(n)}
                                    className={`surface-panel w-full p-5 text-left transition hover:-translate-y-0.5 ${!n.is_read ? "ring-1 ring-orange-500/30" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 gap-4">
                                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.chip}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-base font-semibold text-foreground">{n.title}</span>
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.chip}`}>{config.label}</span>
                                                    {!n.is_read && (
                                                        <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                                                            {text.newBadge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{n.message}</p>
                                                <div className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(e, n.id)}
                                            className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                            aria-label={text.deleteAria}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
