import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { deleteChecklist } from "@/services/checklistService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Search,
    ClipboardList,
    CheckCircle,
    Edit,
    Trash2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Checklist {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    checklist_type: string | null;
    checklist_items: any[];
    created_at: string;
}

export default function ChecklistsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [checklists, setChecklists] = useState < Checklist[] > ([]);
    const [filteredChecklists, setFilteredChecklists] = useState < Checklist[] > ([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadData = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);

                const { data, error } = await supabase
                    .from("checklists")
                    .select("*, checklist_items(*)")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                if (data) {
                    setChecklists(data);
                    setFilteredChecklists(data);
                }
            } catch (error) {
                console.error("Error loading checklists:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [router]);

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            setFilteredChecklists(
                checklists.filter(
                    (item) =>
                        item.title.toLowerCase().includes(query) ||
                        item.description?.toLowerCase().includes(query)
                )
            );
        } else {
            setFilteredChecklists(checklists);
        }
    }, [searchQuery, checklists]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t("checklists.confirmDelete"))) return;

        try {
            await deleteChecklist(id);
            setChecklists(checklists.filter((c) => c.id !== id));
            toast({ title: t("common.success"), description: t("checklists.deleteSuccess") });
        } catch (error) {
            toast({ title: t("common.error"), description: t("checklists.deleteError"), variant: "destructive" });
        }
    };

    const isAdmin = userRole === "admin" || userRole === "supervisor";
    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${t("checklists.title")} - MACHINA`} />

            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("checklists.title")}</h1>
                        <p className="text-muted-foreground mt-1">{t("checklists.subtitle")}</p>
                    </div>
                    {isAdmin && (
                        <Button
                            className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                            onClick={() => router.push("/checklists/new")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t("checklists.addChecklist")}
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
                    {filteredChecklists.map((checklist) => (
                        <Card
                            key={checklist.id}
                            className="rounded-2xl border-0 bg-card shadow-sm backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                            onClick={() => router.push(`/checklists/edit/${checklist.id}`)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <ClipboardList className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <Badge
                                        className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${checklist.is_active
                                            ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                                            : "bg-gray-100 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-300 dark:border-slate-500/30"
                                            }`}
                                    >
                                        {checklist.is_active ? t("checklists.active") : t("checklists.inactive")}
                                    </Badge>
                                </div>

                                <h3 className="font-bold text-foreground text-lg mb-2">{checklist.title}</h3>
                                {checklist.description && (
                                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{checklist.description}</p>
                                )}

                                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>{checklist.checklist_items?.length || 0} {t("checklists.items")}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {isAdmin && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-border"
                                                onClick={() => router.push(`/checklists/edit/${checklist.id}`)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                onClick={(e) => handleDelete(checklist.id, e)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredChecklists.length === 0 && (
                    <Card className="rounded-2xl border-0 bg-card shadow-sm backdrop-blur-sm p-12 text-center">
                        <ClipboardList className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">{t("checklists.noChecklists")}</h3>
                        <p className="text-muted-foreground mb-6">{t("checklists.noChecklistsDesc")}</p>
                        {isAdmin && (
                            <Button
                                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                                onClick={() => router.push("/checklists/new")}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t("checklists.addFirst")}
                            </Button>
                        )}
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}

