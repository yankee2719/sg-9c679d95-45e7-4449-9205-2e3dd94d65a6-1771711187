// src/pages/work-orders/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

type WorkOrder = {
    id: string;
    title: string | null;
    status: string | null;
    priority: string | null;
    type: string | null;
};

export default function WorkOrdersIndexPage() {
    const router = useRouter();
    const [items, setItems] = useState < WorkOrder[] > ([]);
    const [role, setRole] = useState < string > ("technician");
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    const typeFromQuery =
        typeof router.query.type === "string" ? router.query.type : null;

    const canCreate = role === "admin" || role === "supervisor";

    useEffect(() => {
        const load = async () => {
            setLoading(true);

            const ctx: any = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }

            setRole(ctx.role ?? "technician");

            let query = supabase
                .from("work_orders")
                .select("id,title,status,priority,type")
                .order("created_at", { ascending: false });

            if (typeFromQuery) query = query.eq("type", typeFromQuery);

            const { data } = await query;
            setItems(data ?? []);
            setLoading(false);
        };

        load();
    }, [router.query.type]);

    const filtered = items.filter((i) =>
        (i.title ?? "").toLowerCase().includes(q.toLowerCase())
    );

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Work Orders</h1>

                    {canCreate && (
                        <Button
                            onClick={() =>
                                router.push(
                                    typeFromQuery
                                        ? `/work-orders/new?type=${typeFromQuery}`
                                        : "/work-orders/new"
                                )
                            }
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo ordine
                        </Button>
                    )}
                </div>

                <Input
                    placeholder="Cerca..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />

                {loading ? (
                    <p>Caricamento...</p>
                ) : (
                    <div className="grid gap-3">
                        {filtered.map((wo) => (
                            <Card
                                key={wo.id}
                                className="cursor-pointer"
                                onClick={() => router.push(`/work-orders/${wo.id}`)}
                            >
                                <CardContent className="p-4">
                                    <div className="font-semibold">
                                        {wo.title ?? "Work Order"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {wo.type} • {wo.status} • {wo.priority}
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