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
    Plus, Search, Building2, ChevronRight, Users, Package, MapPin, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerOrg {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    email: string | null;
    subscription_status: string | null;
    created_at: string;
    member_count?: number;
    machine_count?: number;
}

export default function CustomersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState < string | null > (null);
    const [orgType, setOrgType] = useState < string | null > (null);
    const [customers, setCustomers] = useState < CustomerOrg[] > ([]);
    const [filtered, setFiltered] = useState < CustomerOrg[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                if (ctx.orgType !== "manufacturer") { router.push("/dashboard"); return; }
                setOrgId(ctx.orgId);
                setOrgType(ctx.orgType);

                // Get customer orgs linked to this manufacturer
                const { data: orgs } = await supabase
                    .from("organizations")
                    .select("*")
                    .eq("manufacturer_org_id", ctx.orgId)
                    .order("name");

                if (orgs) {
                    // Enrich with member count and machine assignments
                    const enriched = await Promise.all(orgs.map(async (org) => {
                        const { count: memberCount } = await supabase
                            .from("organization_memberships")
                            .select("*", { count: "exact", head: true })
                            .eq("organization_id", org.id)
                            .eq("is_active", true);

                        const { count: machineCount } = await supabase
                            .from("machine_assignments")
                            .select("*", { count: "exact", head: true })
                            .eq("customer_org_id", org.id)
                            .eq("is_active", true);

                        return {
                            ...org,
                            member_count: memberCount || 0,
                            machine_count: machineCount || 0,
                        };
                    }));
                    setCustomers(enriched);
                    setFiltered(enriched);
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
            setFiltered(customers.filter(c =>
                c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
            ));
        } else {
            setFiltered(customers);
        }
    }, [searchQuery, customers]);

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`Eliminare il cliente "${name}"?\n\nVerranno rimossi anche tutti gli utenti e le assegnazioni macchine.`)) return;
        try {
            // Remove memberships first
            await supabase.from("organization_memberships").delete().eq("organization_id", id);
            // Remove machine assignments
            await supabase.from("machine_assignments").delete().eq("customer_org_id", id);
            // Remove org
            const { error } = await supabase.from("organizations").delete().eq("id", id);
            if (error) throw error;
            setCustomers(prev => prev.filter(c => c.id !== id));
            toast({ title: "Cliente eliminato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    if (loading) return null;

    return (
        <MainLayout>
            <SEO title="Clienti - MACHINA" />
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Clienti</h1>
                        <p className="text-muted-foreground mt-1">Gestisci le organizzazioni dei tuoi clienti</p>
                    </div>
                    <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/customers/new")}>
                        <Plus className="w-4 h-4 mr-2" /> Nuovo Cliente
                    </Button>
                </div>

                {/* Search */}
                <Card className="rounded-2xl border-border bg-card/80">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Cerca clienti..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                {/* Customer list */}
                <div className="space-y-3">
                    {filtered.map(customer => (
                        <Card key={customer.id}
                            className="rounded-2xl border-border bg-card/80 hover:border-blue-500/50 transition-all cursor-pointer group"
                            onClick={() => router.push(`/customers/${customer.id}`)}>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Building2 className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-foreground font-bold text-lg truncate">{customer.name}</h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                                            {customer.city && (
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</span>
                                            )}
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{customer.member_count} utenti</span>
                                            <span className="flex items-center gap-1"><Package className="w-3 h-3" />{customer.machine_count} macchine</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Badge className={
                                        customer.subscription_status === "active" || customer.subscription_status === "trial"
                                            ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                                            : "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"
                                    }>
                                        {customer.subscription_status === "trial" ? "Trial" : customer.subscription_status === "active" ? "Attivo" : customer.subscription_status || "—"}
                                    </Badge>
                                    <button onClick={(e) => handleDelete(e, customer.id, customer.name)}
                                        className="bg-red-500 hover:bg-red-600 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4 text-white" />
                                    </button>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-400" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <Card className="rounded-2xl border-border bg-card/80 p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessun cliente</h3>
                        <p className="text-muted-foreground mb-6">Crea la prima organizzazione cliente per condividere macchine e documentazione</p>
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => router.push("/customers/new")}>
                            <Plus className="w-4 h-4 mr-2" /> Nuovo Cliente
                        </Button>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
