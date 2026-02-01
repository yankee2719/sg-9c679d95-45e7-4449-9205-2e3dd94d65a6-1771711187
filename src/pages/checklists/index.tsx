import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, ListChecks, Search, Settings, FileText } from "lucide-react";
import { getChecklists, deleteChecklist, type ChecklistWithItems } from "@/services/checklistService";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

export default function ChecklistsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      const data = await getChecklists();
      console.log("Checklists loaded:", data);
      setChecklists(data);
    } catch (error) {
      console.error("Error loading checklists:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this checklist?")) return;

    try {
      await deleteChecklist(id);
      loadChecklists();
    } catch (error) {
      console.error("Error deleting checklist:", error);
    }
  };

  const handleStartInspection = async (checklistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to start an inspection",
          variant: "destructive"
        });
        return;
      }

      const { data: execution, error } = await supabase
        .from("checklist_executions")
        .insert({
          checklist_id: checklistId,
          executed_by: user.id,
          status: "in_progress",
          results: {}
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/checklist/${execution.id}`);
    } catch (error) {
      console.error("Error starting inspection:", error);
      toast({
        title: "Error",
        description: "Failed to start inspection",
        variant: "destructive"
      });
    }
  };

  const filteredChecklists = checklists.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <SEO title="Checklists" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Checklists</h1>
            <p className="text-gray-500">Manage inspection templates and forms</p>
          </div>
          <Button onClick={() => router.push("/checklists/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search templates..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChecklists.map((checklist) => (
            <Card key={checklist.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {checklist.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/checklists/edit/${checklist.id}`)}>
                    <Settings className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(checklist.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <FileText className="mr-2 h-4 w-4" />
                    {checklist.items?.length || 0} items
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Category:</span> {checklist.category}
                  </div>
                  {checklist.description && (
                    <p className="text-sm text-gray-500 truncate">{checklist.description}</p>
                  )}
                  <div className="pt-4">
                    <Button className="w-full" variant="outline" onClick={() => handleStartInspection(checklist.id)}>
                      Start Inspection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}