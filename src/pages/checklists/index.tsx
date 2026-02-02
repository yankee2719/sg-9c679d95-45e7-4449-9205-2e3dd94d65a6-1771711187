import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { checklistService } from "@/services/checklistService";
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
  Play
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  items: any[];
  created_at: string;
}

export default function ChecklistsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [filteredChecklists, setFilteredChecklists] = useState<Checklist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as "admin" | "supervisor" | "technician");
        }

        const data = await checklistService.getAllChecklists();
        setChecklists(data);
        setFilteredChecklists(data);
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
            item.name.toLowerCase().includes(query) ||
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
      await checklistService.deleteChecklist(id);
      setChecklists(checklists.filter(c => c.id !== id));
      toast({
        title: t("common.success"),
        description: t("checklists.deleteSuccess"),
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("checklists.deleteError"),
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`${t("checklists.title")} - Maint Ops`} />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("checklists.title")}</h1>
            <p className="text-slate-400 mt-1">{t("checklists.subtitle")}</p>
          </div>
          {(userRole === "admin" || userRole === "supervisor") && (
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
              onClick={() => router.push("/checklists/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("checklists.addChecklist")}
            </Button>
          )}
        </div>

        {/* Search */}
        <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChecklists.map((checklist) => (
            <Card
              key={checklist.id}
              className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
              onClick={() => router.push(`/checklists/edit/${checklist.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-blue-400" />
                  </div>
                  <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${
                    checklist.is_active
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}>
                    {checklist.is_active ? t("checklists.active") : t("checklists.inactive")}
                  </Badge>
                </div>

                <h3 className="font-bold text-white text-lg mb-2">{checklist.name}</h3>
                {checklist.description && (
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{checklist.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{checklist.items?.length || 0} {t("checklists.items")}</span>
                  </div>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="flex-1 bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                    onClick={() => router.push(`/checklist/execute?checklistId=${checklist.id}`)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {t("checklists.execute")}
                  </Button>
                  {(userRole === "admin" || userRole === "supervisor") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
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

        {/* Empty State */}
        {filteredChecklists.length === 0 && (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
            <ClipboardList className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t("checklists.noChecklists")}</h3>
            <p className="text-slate-400 mb-6">{t("checklists.noChecklistsDesc")}</p>
            {(userRole === "admin" || userRole === "supervisor") && (
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