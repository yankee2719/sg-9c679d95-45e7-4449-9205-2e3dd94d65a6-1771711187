import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRight } from "lucide-react";

type ChecklistTemplate = {
    id: string;
    name: string;
    description: string | null;
    target_type: "machine" | "production_line";
    version: number;
    is_active: boolean;
    created_at: string;
};

function canManage(role?: string) {
    return role === "admin" || role === "supervisor";
}

export default function ChecklistTemplatesPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [role, setRole] = useState < string > ("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [loading, setLoading] = useState(true);

    const [templates, setTemplates] = useState < ChecklistTemplate[] > ([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const allow = useMemo(() => canManage(role), [role]);

    const load = async () => {
        setLoading(true);
        try {
            const ctx: any = await getUserContext();
            const r = ctx?.role ?? "technician";
            setRole(r);

            const oid =
                ctx?.orgId || ctx?.organizationId || ctx?.organization_id || ctx?.tenant_id || null;
            if (!oid) throw new Error("Organization non trovata.");
            setOrgId(oid);

            const { data, error } = await supabase
                .from("checklist_templates")
                .select("id,name,description,target_type,version,is_active,created_at")
                .eq("organization_id", oid)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTemplates((data ?? []) as any);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento templates",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createTemplate = async () => {
        if (!allow) {
            toast({ title: "Permesso negato", description: "Solo Admin/Supervisor.", variant: "destructive" });
            return;
        }
        if (!orgId) return;
        if (!name.trim()) {
            toast({ title: "Errore", description: "Inserisci un nome template.", variant: "destructive" });
            return;
        }

        try {
            const id = crypto.randomUUID(); // perché nel tuo schema non è garantito default
            const { error } = await supabase.from("checklist_templates").insert({
                id,
                organization_id: orgId,
                name: name.trim(),
                description: description.trim() || null,
                target_type: "machine",
                version: 1,
                is_active: true,
            });

            if (error) throw error;

            setName("");
            setDescription("");
            toast({ title: "OK", description: "Template creato." });
            router.push(`/checklists/templates/${id}`);
        } catch (e: any) {
            console.error(e);
            toast({ title: "Errore", description: e?.message ?? "Errore creazione template", variant: "destructive" });
        }
    };

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Checklist Templates</h1>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={createTemplate}
                        disabled={!allow}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo Template
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Nuovo Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Controlli giornalieri" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrizione</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Il template è riutilizzabile su più macchine (assegnazioni).
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading && <div>Loading...</div>}
                    {!loading &&
                        templates.map((t) => (
                            <Card key={t.id} className="hover:border-orange-400 cursor-pointer" onClick={() => router.push(`/checklists/templates/${t.id}`)}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="font-semibold">{t.name}</div>
                                    <div className="text-sm text-muted-foreground">{t.description ?? "—"}</div>
                                    <div className="text-xs text-muted-foreground">
                                        target: {t.target_type} • v{t.version} • {t.is_active ? "active" : "inactive"}
                                    </div>
                                    <div className="flex items-center gap-2 text-orange-500 text-sm">
                                        Apri <ArrowRight className="w-4 h-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </div>
        </MainLayout>
    );
}