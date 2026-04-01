import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Filter, Loader2, Search, Trash2 } from "lucide-react";
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { notificationService, type Notification } from "@/services/notificationService";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const copy = {
    it: {
        seo: "Notifiche - MACHINA",
        title: "Notifiche",
        subtitle: "Gestisci notifiche operative, alert e aggiornamenti di sistema.",
        total: "Totali",
        unread: "Non lette",
        read: "Lette",
        loading: "Caricamento notifiche...",
        empty: "Nessuna notifica trovata.",
        search: "Cerca nelle notifiche...",
        all: "Tutte",
        onlyUnread: "Solo non lette",
        onlyRead: "Solo lette",
        markAllRead: "Segna tutte come lette",
        deleteRead: "Elimina lette",
        markRead: "Segna letta",
        delete: "Elimina",
    },
    en: {
        seo: "Notifications - MACHINA",
        title: "Notifications",
        subtitle: "Manage operational alerts, reminders and system updates.",
        total: "Total",
        unread: "Unread",
        read: "Read",
        loading: "Loading notifications...",
        empty: "No notifications found.",
        search: "Search notifications...",
        all: "All",
        onlyUnread: "Unread only",
        onlyRead: "Read only",
        markAllRead: "Mark all as read",
        deleteRead: "Delete read",
        markRead: "Mark as read",
        delete: "Delete",
    },
    fr: {
        seo: "Notifications - MACHINA",
        title: "Notifications",
        subtitle: "Gérez les alertes opérationnelles, rappels et mises à jour système.",
        total: "Total",
        unread: "Non lues",
        read: "Lues",
        loading: "Chargement des notifications...",
        empty: "Aucune notification trouvée.",
        search: "Rechercher dans les notifications...",
        all: "Toutes",
        onlyUnread: "Seulement non lues",
        onlyRead: "Seulement lues",
        markAllRead: "Tout marquer comme lu",
        deleteRead: "Supprimer les lues",
        markRead: "Marquer comme lue",
        delete: "Supprimer",
    },
    es: {
        seo: "Notificaciones - MACHINA",
        title: "Notificaciones",
        subtitle: "Gestiona alertas operativas, recordatorios y actualizaciones del sistema.",
        total: "Totales",
        unread: "No leídas",
        read: "Leídas",
        loading: "Cargando notificaciones...",
        empty: "No se encontraron notificaciones.",
        search: "Buscar notificaciones...",
        all: "Todas",
        onlyUnread: "Solo no leídas",
        onlyRead: "Solo leídas",
        markAllRead: "Marcar todas como leídas",
        deleteRead: "Eliminar leídas",
        markRead: "Marcar leída",
        delete: "Eliminar",
    },
} as const;

type FilterMode = "all" | "unread" | "read";

function getTypeBadge(type: string) {
    switch (type) {
        case "maintenance_overdue":
            return "bg-red-500/15 text-red-300 border-red-500/30";
        case "maintenance_due":
            return "bg-amber-500/15 text-amber-300 border-amber-500/30";
        case "wo_assigned":
        case "wo_completed":
            return "bg-blue-500/15 text-blue-300 border-blue-500/30";
        case "checklist_completed":
        case "checklist_assigned":
            return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
        default:
            return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    }
}

function formatDate(value: string, language: string) {
    const locale = language === "it" ? "it-IT" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-GB";
    return new Date(value).toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function SettingsNotificationsPage() {
    const { language } = useLanguage();
    const text = copy[language];
    const { membership } = useAuth();

    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState < Notification[] > ([]);
    const [search, setSearch] = useState("");
    const [filterMode, setFilterMode] = useState < FilterMode > ("all");
    const [busyId, setBusyId] = useState < string | null > (null);
    const [bulkBusy, setBulkBusy] = useState < "read" | "delete" | null > (null);

    const load = async () => {
        setLoading(true);
        try {
            const result = await notificationService.getMyNotifications({ limit: 100 });
            setNotifications(result.notifications);
        } catch (error) {
            console.error("Notifications load error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const filteredNotifications = useMemo(() => {
        return notifications.filter((notification) => {
            const q = search.trim().toLowerCase();
            const matchesSearch = !q || notification.title.toLowerCase().includes(q) || notification.message.toLowerCase().includes(q) || (notification.type || "").toLowerCase().includes(q);
            const matchesFilter =
                filterMode === "all" ||
                (filterMode === "unread" && !notification.is_read) ||
                (filterMode === "read" && notification.is_read);
            return matchesSearch && matchesFilter;
        });
    }, [notifications, search, filterMode]);

    const stats = useMemo(() => ({
        total: notifications.length,
        unread: notifications.filter((n) => !n.is_read).length,
        read: notifications.filter((n) => n.is_read).length,
    }), [notifications]);

    const handleMarkRead = async (id: string) => {
        setBusyId(id);
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        } catch (error) {
            console.error(error);
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (id: string) => {
        setBusyId(id);
        try {
            await notificationService.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (error) {
            console.error(error);
        } finally {
            setBusyId(null);
        }
    };

    const handleMarkAllRead = async () => {
        setBulkBusy("read");
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        } catch (error) {
            console.error(error);
        } finally {
            setBulkBusy(null);
        }
    };

    const handleDeleteRead = async () => {
        setBulkBusy("delete");
        try {
            await notificationService.deleteAllRead();
            setNotifications((prev) => prev.filter((n) => !n.is_read));
        } catch (error) {
            console.error(error);
        } finally {
            setBulkBusy(null);
        }
    };

    return (
        <OrgContextGuard>
            <MainLayout userRole={membership?.role ?? "technician"}>
                <SEO title={text.seo} />

                <div className="px-5 py-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-[1380px] space-y-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">{text.title}</h1>
                            <p className="text-base text-muted-foreground">{text.subtitle}</p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{text.total}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.total}</CardContent></Card>
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{text.unread}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.unread}</CardContent></Card>
                            <Card className="rounded-2xl"><CardHeader><CardTitle>{text.read}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.read}</CardContent></Card>
                        </div>

                        <Card className="rounded-2xl">
                            <CardContent className="space-y-4 p-6">
                                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input className="pl-9" placeholder={text.search} value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>
                                    <Button variant={filterMode === "all" ? "default" : "outline"} onClick={() => setFilterMode("all")}>
                                        <Filter className="mr-2 h-4 w-4" />{text.all}
                                    </Button>
                                    <Button variant={filterMode === "unread" ? "default" : "outline"} onClick={() => setFilterMode("unread")}>{text.onlyUnread}</Button>
                                    <Button variant={filterMode === "read" ? "default" : "outline"} onClick={() => setFilterMode("read")}>{text.onlyRead}</Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => void handleMarkAllRead()} disabled={bulkBusy !== null || stats.unread === 0}>
                                            {bulkBusy === "read" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />} {text.markAllRead}
                                        </Button>
                                        <Button variant="outline" onClick={() => void handleDeleteRead()} disabled={bulkBusy !== null || stats.read === 0}>
                                            {bulkBusy === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} {text.deleteRead}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {loading ? (
                                <Card className="rounded-2xl"><CardContent className="p-6 text-muted-foreground">{text.loading}</CardContent></Card>
                            ) : filteredNotifications.length === 0 ? (
                                <Card className="rounded-2xl"><CardContent className="p-6 text-muted-foreground">{text.empty}</CardContent></Card>
                            ) : (
                                filteredNotifications.map((notification) => (
                                    <Card key={notification.id} className="rounded-2xl">
                                        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                                    <div className="font-semibold text-foreground">{notification.title}</div>
                                                    <Badge className={getTypeBadge(notification.type || "")}>{notification.type || "system"}</Badge>
                                                    {!notification.is_read && <Badge variant="secondary">new</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                                                <div className="text-xs text-muted-foreground">{formatDate(notification.created_at, language)}</div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                {!notification.is_read && (
                                                    <Button variant="outline" size="sm" disabled={busyId === notification.id} onClick={() => void handleMarkRead(notification.id)}>
                                                        {busyId === notification.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                        {text.markRead}
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="sm" disabled={busyId === notification.id} onClick={() => void handleDelete(notification.id)}>
                                                    {busyId === notification.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                    {text.delete}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </MainLayout>
        </OrgContextGuard>
    );
}
