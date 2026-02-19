import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExecuteChecklistPage() {
    const router = useRouter();
    const { schedule, equipment, work_order_id, checklist_id: directChecklistId } = router.query;
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState < string | null > (null);

    useEffect(() => {
        if (!router.isReady) return;

        // Mode 1: Direct checklist execution from a Work Order
        if (directChecklistId && work_order_id) {
            createDirectExecution();
        }
        // Mode 2: Legacy — from maintenance schedule
        else if (schedule && equipment) {
            createExecution();
        } else {
            setError("Parametri mancanti");
            setLoading(false);
        }
    }, [router.isReady, schedule, equipment, directChecklistId, work_order_id]);

    // =========================================================================
    // MODE 1: Direct execution from Work Order
    // =========================================================================
    const createDirectExecution = async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setError("Utente non autenticato");
                setLoading(false);
                return;
            }

            // Verify checklist exists
            const { data: checklistData, error: checklistError } = await supabase
                .from("checklists")
                .select("id, name")
                .eq("id", directChecklistId as string)
                .single();

            if (checklistError || !checklistData) {
                setError("Checklist non trovata");
                setLoading(false);
                return;
            }

            // Get machine_id from work order if available
            let machineId = null;
            const { data: woData } = await supabase
                .from("work_orders")
                .select("machine_id")
                .eq("id", work_order_id as string)
                .single();
            if (woData) machineId = woData.machine_id;

            // Create execution linked to work order
            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .insert({
                    checklist_id: directChecklistId as string,
                    machine_id: machineId,
                    work_order_id: work_order_id as string,
                    executed_by: user.id,
                    status: "in_progress",
                    overall_status: "in_progress",
                    results: {},
                    started_at: new Date().toISOString(),
                })
                .select("id")
                .single();

            if (executionError) {
                console.error("Error creating execution:", executionError);
                setError("Impossibile creare l'esecuzione della checklist");
                setLoading(false);
                return;
            }

            // Auto-transition WO to in_progress if still pending
            const { data: wo } = await supabase
                .from("work_orders")
                .select("status, started_at")
                .eq("id", work_order_id as string)
                .single();

            if (wo && ["draft", "scheduled", "assigned"].includes(wo.status)) {
                await supabase.from("work_orders").update({
                    status: "in_progress",
                    started_at: wo.started_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }).eq("id", work_order_id as string);
            }

            router.replace(`/checklist/${executionData.id}`);
        } catch (err) {
            console.error("Unexpected error:", err);
            setError("Si è verificato un errore imprevisto");
            setLoading(false);
        }
    };

    // =========================================================================
    // MODE 2: Legacy — from maintenance schedule
    // =========================================================================
    const createExecution = async () => {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                setError("Utente non autenticato");
                setLoading(false);
                return;
            }

            // Get user's tenant_id
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("tenant_id")
                .eq("id", user.id)
                .single();

            if (profileError || !profile?.tenant_id) {
                console.error("Error loading profile:", profileError);
                setError("Profilo utente non trovato o tenant non assegnato");
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

            // Create a new checklist execution WITH tenant_id
            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .insert({
                    checklist_id: scheduleData.checklist_id,
                    executed_by: user.id,
                    status: "in_progress",
                    results: {},
                    started_at: new Date().toISOString(),
                    schedule_id: schedule as string,
                    tenant_id: profile.tenant_id,
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
                        <h2 className="text-xl font-semibold text-foreground">Impossibile avviare la checklist</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-primary text-foreground rounded-md hover:bg-primary/90"
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
