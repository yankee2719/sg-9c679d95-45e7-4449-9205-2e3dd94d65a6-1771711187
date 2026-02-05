import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExecuteChecklistPage() {
  const router = useRouter();
  const { schedule, equipment } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady && schedule && equipment) {
      createExecution();
    } else if (router.isReady && (!schedule || !equipment)) {
      setError("Parametri mancanti: schedule o equipment non forniti");
      setLoading(false);
    }
  }, [router.isReady, schedule, equipment]);

  const createExecution = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Utente non autenticato");
        setLoading(false);
        return;
      }

      // Get the maintenance schedule to find the checklist_id
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("maintenance_schedules")
        .select("checklist_id, equipment_id")
        .eq("id", schedule as string)
        .single();

      if (scheduleError || !scheduleData) {
        console.error("Error loading schedule:", scheduleError);
        setError("Programmazione manutenzione non trovata");
        setLoading(false);
        return;
      }

      if (!scheduleData.checklist_id) {
        setError("Nessuna checklist associata a questa manutenzione. Modifica la programmazione per aggiungere una checklist.");
        setLoading(false);
        return;
      }

      // Check if checklist exists
      const { data: checklistData, error: checklistError } = await supabase
        .from("checklists")
        .select("id, name")
        .eq("id", scheduleData.checklist_id)
        .single();

      if (checklistError || !checklistData) {
        console.error("Error loading checklist:", checklistError);
        setError("Checklist non trovata");
        setLoading(false);
        return;
      }

      // Create a new checklist execution
      const { data: executionData, error: executionError } = await supabase
        .from("checklist_executions")
        .insert({
          checklist_id: scheduleData.checklist_id,
          executed_by: user.id,
          status: "in_progress",
          results: {},
          started_at: new Date().toISOString(),
          schedule_id: schedule as string
        })
        .select("id")
        .single();

      if (executionError) {
        console.error("Error creating execution:", executionError);
        setError("Impossibile creare l'esecuzione della checklist");
        setLoading(false);
        return;
      }

      // Redirect to the execution page
      router.replace(`/checklist/${executionData.id}`);

    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Si è verificato un errore imprevisto");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Preparazione checklist...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-white">Impossibile avviare la checklist</h2>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Torna indietro
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return null;
}