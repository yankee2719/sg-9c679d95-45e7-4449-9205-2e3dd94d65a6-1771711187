// src/pages/customers/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getUserContext } from "@/lib/supabaseHelpers";
import { ArrowLeft, XCircle, Search, Factory, Wrench } from "lucide-react";

type AssignmentRow = {
    id: string;
    machine_id: string;
    customer_org_id: string;
    manufacturer_org_id: string;
    is_active: boolean;
    assigned_at: string | null;
    revoked_at: string | null;
    revoked_by: string | null;
};

type MachineRow = {
    id: string;
    name: string;
    internal_code: string | null;
    serial_number: string | null;
    category: string | null;
    position: string | null;
};

export default function CustomerDetailPage() {
    const router = useRouter();
    const { toast } = useToast();
    const customerId = (router.query.id as string) || "";

    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState < string > ("technician");

    const [customer, setCustomer] = useState < any | null > (null);
    const [assignments, setAssignments] = useState <
        Array < AssignmentRow & { machine: MachineRow } >
  > ([]);
    const [query, setQuery] = useState("");

    const canEdit = useMemo(
        () => userRole === "admin" || userRole === "supervisor",
        [userRole]
    );

    const load = async () => {
        if (!customerId) return;
        setLoading(true);
        try {
            const ctx: any = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }
            setUserRole(ctx.role ?? "technician");

            const { data: cust, error: custErr } = await supabase
                .from("organizations")
                .select("id,name")
                .eq("id", customerId)
                .maybeSingle();
            if (custErr) throw custErr;
            setCustomer(cust);

            const { data, error } = await supabase
                .from("machine_assignments")
                .select(
                    `
          id,
          machine_id,
          customer_org_id,
          manufacturer_org_id,
          is_active,
          assigned_at,
          revoked_at,
          revoked_by,
          machine:machines (
            id, name, internal_code, serial_number, category, position
          )
        `
                )
                .eq("customer_org_id", customerId)
                .eq("is_active", true)
                .order("assigned_at", { ascending: false });

            if (error) throw error;

            setAssignments((data ?? []) as any);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento cliente",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return assignments;
        return assignments.filter((a) => {
            const m = a.machine;
            const hay = `${m?.name ?? ""} ${m?.internal_code ?? ""} ${m?.serial_number ?? ""} ${m?.category ?? ""
                } ${m?.position ?? ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [assignments, query]);

    const revokeAssignment = async (assignmentId: string, machineName: string) => {
        if (!canEdit) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin/Supervisor possono rimuovere assegnazioni.",
                variant: "destructive",
            });
            return;
        }

        if (!assignmentId || assignmentId.trim().length < 10) {
            toast({
                title: "Errore",
                description: "ID assegnazione mancante (non posso eseguire la revoca).",
                variant: "destructive",
            });
            return;
        }

        const ok = confirm(`Vuoi rimuovere l'assegnazione di "${machineName}" da questo cliente?`);
        if (!ok) return;

        try {
            const { data: userRes } = await supabase.auth.getUser();
            const revokedBy = userRes?.user?.id ?? null;

            const { error } = await supabase
                .from("machine_assignments")
                .update({
                    is_active: false,
                    revoked_at: new Date().toISOString(),
                    revoked_by: revokedBy,
                })
                .eq("id", assignmentId);

            if (error) throw error;

            toast({ title: "OK", description: "Assegnazione rimossa (audit registrato)" });
            setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore revoca assegnazione",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <MainLayout userRole={userRole as any}>
                <SEO title="Cliente - MACHINA" />
                <div className="p-6 text-sm text-muted-foreground">Caricamento...</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${customer?.name ?? "Cliente"} - MACHINA`} />

            <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <Button variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                        </Button>
                        <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
                            <Factory className="w-5 h-5 text-muted-foreground" />
                            {customer?.name ?? "Cliente"}
                        </h1>
                        <p className="text-muted-foreground">Macchine assegnate a questo cliente</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Assegnazioni attive</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cerca macchina..."
                                className="pl-9"
                            />
                        </div>

                        {filtered.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nessuna assegnazione attiva.</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {filtered.map((a) => (
                                    <Card key={a.id} className="border border-border rounded-xl">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-semibold truncate">{a.machine?.name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono truncate">
                                                        {a.machine?.internal_code ?? "—"}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        {a.machine?.category && (
                                                            <Badge variant="outline">{a.machine.category}</Badge>
                                                        )}
                                                        <Badge variant="outline">Assegnata</Badge>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/equipment/${a.machine_id}`)}
                                                    >
                                                        <Wrench className="w-4 h-4 mr-2" />
                                                        Apri
                                                    </Button>

                                                    {canEdit && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                revokeAssignment(a.id, a.machine?.name ?? "macchina")
                                                            }
                                                        >
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                            Rimuovi
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {a.machine?.position && (
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    Posizione: {a.machine.position}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}