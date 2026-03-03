// src/pages/work-orders/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";

type WorkOrder = {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    work_type: string | null;
    created_at?: string | null;
};

export default function WorkOrdersIndexPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState < string > ("technician");

    const [items, setItems] = useState < WorkOrder[] > ([]);
    const [q, setQ] = useState("");

    const [status, setStatus] = useState("all");
    const [priority, setPriority] = useState("all");

    const workTypeFromQuery = useMemo(() => {
        const t = router.query.work_type;
        return typeof t === "string" && t.trim() ? t.trim() : null;
    }, [router.query.work_type]);

    const canCreate = role === "admin" || role === "supervisor";

    const load = async () => {
        setLoading(true);
        try {
            const ctx: any = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }
            setRole(ctx.role ?? "technician");

            let query = supabase
                .from("work_orders")
                .select("id,title,status,priority,work_type,created_at")
                .order("created_at", { ascending: false });

            if (workTypeFromQuery) query = query.eq("work_type", workTypeFromQuery);
            if (status !== "all") query = query.eq("status", status);
            if (priority !== "all") query = query.eq("priority", priority);

            const { data, error } = await query;
            if (error) throw error;

            const list = (data ?? []) as WorkOrder[];
            const ql = q.trim().toLowerCase();

            const filtered =
                !ql
                    ? list
                    : list.filter((wo) => (wo.title ?? "").toLowerCase().includes(ql));

            setItems(filtered);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento work orders",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workTypeFromQuery, status, priority]);

    useEffect(() => {
        const t = setTimeout(() => load(), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const newHref = useMemo(() => {
        return workTypeFromQuery
            ? `/work-orders/new?work_type=${encodeURIComponent(workTypeFromQuery)}`
            : "/work-orders/new";
    }, [workTypeFromQuery]);

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold">Work Orders</h1>
                        <p className="text-muted-foreground">
                            Unica entità. Il tipo è <span className="font-mono">work_type</span>.
                        </p>
                    </div>

                    {canCreate && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push(newHref)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo ordine
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Cerca titolo..."
                                    className="pl-9"
                                />
                            </div>

                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Stato" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In progress</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Priorità" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutte</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline">{items.length} risultati</Badge>
                            {workTypeFromQuery && (
                                <span>
                                    filtro: <span className="font-mono">{workTypeFromQuery}</span>
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="text-sm text-muted-foreground">Caricamento...</div>
                ) : items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nessun work order.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {items.map((wo) => (
                            <Card
                                key={wo.id}
                                className="cursor-pointer hover:border-[#FF6B35]/40 transition-colors"
                                onClick={() => router.push(`/work-orders/${wo.id}`)}
                            >
                                <CardContent className="p-4">
                                    <div className="font-semibold text-sm truncate">
                                        {wo.title ?? "Work Order"}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {wo.work_type ?? "—"} • {wo.status ?? "—"} • {wo.priority ?? "—"}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}