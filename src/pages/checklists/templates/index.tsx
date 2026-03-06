import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ClipboardList, Plus, RefreshCcw } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type TargetType = "machine" | "production_line";

type ChecklistTemplate = {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    target_type: TargetType;
    version: number;
    is_active: boolean;
    created_at: string;
};

type ItemCountRow = {
    template_id: string;
    count: number;
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
    const [saving, setSaving] = useState(false);

    const [templates, setTemplates] = useState < ChecklistTemplate[] > ([]);
    const [itemCountMap, setItemCountMap] = useState < Record < string, number>> ({});

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetType, setTargetType] = useState < TargetType > ("machine");

    const allow = useMemo(() => canManage(role), [role]);

    const load = async () => {
        setLoading(true);
        try {
            const ctx = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }

            const activeOrgId = ctx.orgId ?? null;
            if (!activeOrgId) throw new Error("Organizzazione attiva non trovata nel contesto utente.");

            setRole(ctx.role ?? "technician");
            setOrgId(activeOrgId);

            const { data: rows, error } = await supabase
                .from("checklist_templates")
                .select("id, organization_id, name, description, target_type, version, is_active, created_at")
                .eq("organization_id", activeOrgId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const templateRows = (rows ?? []) as ChecklistTemplate[];
            setTemplates(templateRows);

            if (templateRows.length === 0) {
                setItemCountMap({});
                return;
            }

            const templateIds = templateRows.map((t) => t.id);
            const { data: items, error: itemsErr } = await supabase
                .from("checklist_template_items")
                .select("template_id")
                .in("template_id", templateIds)
                .limit(5000);

            if (itemsErr) throw itemsErr;

            const counts: Record<string, number> = {};
            for (const row of (items ?? []) as any[]) {
                counts[row.template_id] = (counts[row.template_id] ?? 0) + 1;
            }
            setItemCountMap(counts);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore caricamento template checklist",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const createTemplate = async () => {
        if (!allow) {
            toast({
                title: "Permesso negato",
                description: "Solo Admin e Supervisor possono creare template.",
                variant: "destructive",
            });
            return;
        }

        if (!orgId) {
            toast({
                title: "Errore",
                description: "Organizzazione attiva non disponibile.",
                variant: "destructive",
            });
            return;
        }

        if (!name.trim()) {
            toast({
                title: "Errore",
                description: "Inserisci il nome del template.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            const newId = crypto.randomUUID();

            const { error } = await supabase.from("checklist_templates").insert({
                id: newId,
                organization_id: orgId,
                name: name.trim(),
                description: description.trim() || null,
                target_type: targetType,
                version: 1,
                is_active: true,
            });

            if (error) throw error;

            toast({ title: "OK", description: "Template creato correttamente." });
            router.push(`/checklists/templates/${newId}`);
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Errore",
                description: e?.message ?? "Errore creazione template",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <MainLayout userRole={role as any}>
            <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ClipboardList className="w-6 h-6" />
                            Template checklist
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Modelli riutilizzabili per controlli macchina o linea. L&apos;owner operativo crea, assegna ed esegue.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={load}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Aggiorna
                        </Button>
                        <Button onClick={createTemplate} disabled={!allow || saving} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo template
                        </Button>
                    </div>
                </div>

                <Card className="rounded-2xl">
                    <CardHeader>
                        <CardTitle>Crea template</CardTitle>
                        <CardDescription>
                            Usa questa sezione per creare un template standard da assegnare poi a macchine o linee.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Es. Controlli giornalieri pressa"
                                    disabled={!allow}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Target</Label>
                                <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)} disabled={!allow}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona target" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="machine">Macchina</SelectItem>
                                        <SelectItem value="production_line">Linea</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>Descrizione</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Descrizione opzionale del template"
                                    disabled={!allow}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading && <div className="text-sm text-muted-foreground">Caricamento template...</div>}

                    {!loading && templates.length === 0 && (
                        <Card className="rounded-2xl border-dashed md:col-span-2 xl:col-span-3">
                            <CardContent className="py-10 text-center text-sm text-muted-foreground">
                                Nessun template presente in questa organizzazione.
                            </CardContent>
                        </Card>
                    )}

                    {!loading &&
                        templates.map((template) => (
                            <Card
                                key={template.id}
                                className="rounded-2xl cursor-pointer transition hover:shadow-md"
                                onClick={() => router.push(`/checklists/templates/${template.id}`)}
                            >
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-semibold text-base">{template.name}</div>
                                            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {template.description || "Nessuna descrizione"}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 shrink-0 mt-1 text-muted-foreground" />
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary">{template.target_type === "machine" ? "Macchina" : "Linea"}</Badge>
                                        <Badge variant="outline">v{template.version}</Badge>
                                        <Badge variant={template.is_active ? "default" : "secondary"}>
                                            {template.is_active ? "Attivo" : "Inattivo"}
                                        </Badge>
                                        <Badge variant="outline">{itemCountMap[template.id] ?? 0} items</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </div>
        </MainLayout>
    );
}
