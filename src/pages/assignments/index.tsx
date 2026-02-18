import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search, Package, Wrench, Building2, ArrowRight, ChevronRight, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assignment {
    id: string;
    machine_id: string;
    machine_name: string;
    internal_code: string;
    customer_org_id: string;
    customer_name: string;
    assigned_at: string;
    is_active: boolean;
}

export default function AssignmentsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState < Assignment[] > ([]);
    const [filtered, setFiltered] = useState < Assignment[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx || ctx.orgType !== "manufacturer") { router.push("/dashboard"); return; }

                const { data } = await supabase
                    .from("machine_assignments")
                    .select("id, machine_id, customer_org_id, assigned_at, is_active, machines(name, internal_code), organizations!machine_assignments_customer_org_id_fkey(name)")
                    .eq("is_active", true)
                    .order("assigned_at", { ascending: false });

                if (data) {
                    const mapped = data.map((a: any) => ({
                        id: a.id,
                        machine_id: a.machine_id,
                        machine_name: a.machines?.name || "—",
                        internal_code: a.machines?.internal_code || "—",
                        customer_org_id: a.customer_org_id,
                        customer_name: a.organizations?.name || "—",
                        assigned_at: a.assigned_at,
                        is_active: a.is_active,
                    }));
                    setAssignments(mapped);
                    setFiltered(mapped);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    useEffect(() => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            setFiltered(assignments.filter(a =>
                a.machine_name.toLowerCase().includes(q) ||
                a.internal_code.toLowerCase().includes(q) ||
                a.customer_name.toLowerCase().includes(q)
            ));
        } else {
            setFiltered(assignments);
        }
    }, [searchQuery, assignments]);

    const handleDeactivate = async (id: string) => {
        if (!confirm("Rimuovere questa assegnazione?")) return;
        try {
            const { error } = await supabase.from("machine_assignments")
                .update({ is_active: false }).eq("id", id);
            if (error) throw error;
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast({ title: "Assegnazione rimossa" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    // Group by customer
    const byCustomer = filtered.reduce < Record < string, Assignment[]>> ((acc, a) => {
        if (!acc[a.customer_name]) acc[a.customer_name] = [];
        acc[a.customer_name].push(a);
        return acc;
    }, {});

    if (loading) return null;

    return (
        <MainLayout>
            <SEO title="Assegnazioni - MACHINA" />
            <div className="space-y-6 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Assegnazioni Macchine</h1>
                    <p className="text-muted-foreground mt-1">Panoramica di tutte le macchine assegnate ai clienti</p>
                </div>

                {/* Search */}
                <Card className="rounded-2xl border-0 bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Cerca per macchina o cliente..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-xl" />
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{assignments.length}</p>
                            <p className="text-sm text-muted-foreground">Assegnazioni attive</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{Object.keys(byCustomer).length}</p>
                            <p className="text-sm text-muted-foreground">Clienti con macchine</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-0 bg-card shadow-sm">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{new Set(assignments.map(a => a.machine_id)).size}</p>
                            <p className="text-sm text-muted-foreground">Macchine uniche</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Grouped by customer */}
                {Object.entries(byCustomer).map(([customerName, custAssignments]) => (
                    <div key={customerName} className="rounded-2xl border-0 shadow-sm bg-card overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border cursor-pointer"
                            onClick={() => {
                                const cid = custAssignments[0]?.customer_org_id;
                                if (cid) router.push(`/customers/${cid}`);
                            }}>
                            <Building2 className="w-5 h-5 text-blue-400" />
                            <span className="text-foreground font-bold text-lg">{customerName}</span>
                            <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-300 dark:border-blue-500/30">{custAssignments.length} macchine</Badge>
                            <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                        </div>
                        <div className="p-4 space-y-2">
                            {custAssignments.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 group">
                                    <div className="flex items-center gap-3">
                                        <Wrench className="w-4 h-4 text-purple-400" />
                                        <span className="text-foreground font-medium">{a.machine_name}</span>
                                        <span className="text-muted-foreground text-sm">({a.internal_code})</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString("it-IT")}</span>
                                        <button onClick={() => handleDeactivate(a.id)}
                                            className="p-1 rounded bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <Card className="rounded-2xl border-0 bg-card shadow-sm p-12 text-center">
                        <Package className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessuna assegnazione</h3>
                        <p className="text-muted-foreground mb-6">Vai nella scheda di un cliente per assegnare le macchine</p>
                        <Button variant="outline" onClick={() => router.push("/customers")}>
                            <Building2 className="w-4 h-4 mr-2" /> Vai ai Clienti
                        </Button>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

