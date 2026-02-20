import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ClipboardList, CheckCircle, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { listTemplates, deleteTemplate } from "@/services/checklistService";
import { getUserContext } from "@/lib/supabaseHelpers";

interface TemplateRow {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    version: number;
    created_at: string;
    checklist_template_items?: { count: number }[];
}

export default function ChecklistsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [templates, setTemplates] = useState < TemplateRow[] > ([]);
    const [filtered, setFiltered] = useState < TemplateRow[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);

                const data = await listTemplates();
                setTemplates(data as any);
                setFiltered(data as any);
            } catch (e) {
                console.error(e);
                toast({ title: t("common.error"), description: "Errore caricamento templates", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    useEffect(() => {
        if (!searchQuery) return setFiltered(templates);
        const q = searchQuery.toLowerCase();
        setFiltered(
            templates.filter(x =>
                x.name.toLowerCase().includes(q) ||
                (x.description ?? "").toLowerCase().includes(q)
            )
        );
    }, [searchQuery, templates]);

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Confermi eliminazione template?")) return;

        try {
            await deleteTemplate(id);
            setTemplates(prev => prev.filter(x => x.id !== id));
            toast({ title: t("common.success"), description: "Template eliminato" });
        } catch (err: any) {
            toast({ title: t("common.error"), description: err.message ?? "Errore eliminazione", variant: "destructive" });
        }
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${t("checklists.title")} - MACHINA`} />

            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("checklists.title")}</h1>
                        <p className="text-muted-foreground mt-1">Template checklist</p>
                    </div>

                    {isAdmin && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push("/checklists/new")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nuovo Template
                        </Button>
                    )}
                </div>

                <Card className="rounded-2xl border-0 bg-card shadow-sm backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t("common.search")}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-background border-border rounded-xl text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((tpl) => {
                        const itemsCount = tpl.checklist_template_items?.[0]?.count ?? 0;

                        return (
                            <Card
                                key={tpl.id}
                                className="rounded-2xl border-0 bg-card shadow-sm backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                                onClick={() => router.push(`/checklists/edit/${tpl.id}`)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                            <ClipboardList className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <Badge
                                            className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${tpl.is_active
                                                    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                                                    : "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"
                                                }`}
                                        >
                                            {tpl.is_active ? t("checklists.active") : t("checklists.inactive")}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-foreground text-lg mb-2">{tpl.name}</h3>
                                    {tpl.description && (
                                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{tpl.description}</p>
                                    )}

                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>{itemsCount} {t("checklists.items")}</span>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                onClick={(e) => handleDelete(tpl.id, e)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </MainLayout>
    );
}