import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, ChevronLeft, Clock, Flag, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ChecklistItem {
    id: string;
    title: string;
    description: string | null;
    is_required: boolean;
    order_index: number;
    checked?: boolean;
    notes?: string;
    images?: string[];
}

interface ChecklistExecution {
    id: string;
    checklist_id: string;
    executed_by: string;
    started_at: string;
    completed_at?: string;
    status: string;
    signature?: string;
    results?: any;
    schedule_id?: string;
}

interface Checklist {
    id: string;
    name: string;
    description: string | null;
}

export default function ChecklistExecutionPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();

    const [execution, setExecution] = useState < ChecklistExecution | null > (null);
    const [checklist, setChecklist] = useState < Checklist | null > (null);
    const [items, setItems] = useState < ChecklistItem[] > ([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [technicianName, setTechnicianName] = useState("");
    const [signatureDataUrl, setSignatureDataUrl] = useState < string | null > (null);
    const [saveSignature, setSaveSignature] = useState(false);
    const canvasRef = useRef < HTMLCanvasElement > (null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (id && typeof id === "string") {
            loadExecution();
        }
    }, [id]);

    const loadExecution = async () => {
        try {
            setLoading(true);

            const executionId = Array.isArray(id) ? id[0] : id;
            if (!executionId) return;

            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .select("*")
                .eq("id", executionId)
                .single();

            if (executionError) throw executionError;

            console.log("Loaded execution data:", executionData);
            console.log("Schedule ID from execution:", executionData?.schedule_id);

            setExecution(executionData);

            if (executionData.checklist_id) {
                const { data: checklistData, error: checklistError } = await supabase
                    .from("checklists")
                    .select("id, name, description")
                    .eq("id", executionData.checklist_id)
                    .single();

                if (checklistError) throw checklistError;
                setChecklist(checklistData);

                const { data: itemsData, error: itemsError } = await supabase
                    .from("checklist_items")
                    .select("*")
                    .eq("checklist_id", executionData.checklist_id)
                    .order("order_index");

                if (itemsError) throw itemsError;

                const initializedItems = (itemsData || []).map((item: any) => ({
                    ...item,
                    checked: false,
                    notes: ""
                }));
                setItems(initializedItems);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();

                if (profile?.full_name) {
                    setTechnicianName(profile.full_name);
                }
            }
        } catch (error: any) {
            console.error("Error loading execution:", error);
            toast({
                title: "Errore",
                description: "Impossibile caricare l'esecuzione della checklist",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleItemCheck = (index: number) => {
        const newItems = [...items];
        newItems[index].checked = !newItems[index].checked;
        setItems(newItems);
    };

    const handleNoteChange = (index: number, notes: string) => {
        const newItems = [...items];
        newItems[index].notes = notes;
        setItems(newItems);
    };

    const calculateProgress = () => {
        if (items.length === 0) return 0;
        const checkedItems = items.filter(item => item.checked).length;
        return Math.round((checkedItems / items.length) * 100);
    };

    const handleComplete = () => {
        const allChecked = items.every(item => item.checked);
        if (!allChecked) {
            toast({
                title: "Attenzione",
                description: "Completa tutti gli item prima di finalizzare",
                variant: "destructive"
            });
            return;
        }
        setShowSignatureDialog(true);
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        setSignatureDataUrl(null);
    };

    const confirmComplete = async () => {
        try {
            setCompleting(true);

            const canvas = canvasRef.current;
            if (!canvas) {
                toast({
                    title: "Errore",
                    description: "Firma mancante",
                    variant: "destructive"
                });
                return;
            }

            const signatureData = canvas.toDataURL();
            setSignatureDataUrl(signatureData);

            const executionId = Array.isArray(id) ? id[0] : id;

            console.log("Completing checklist execution:", executionId);
            console.log("Schedule ID to update:", execution?.schedule_id);

            // 1. Aggiorna l'esecuzione della checklist
            const { error: updateError } = await supabase
                .from("checklist_executions")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    signature: signatureData,
                    results: JSON.stringify(items)
                })
                .eq("id", executionId);

            if (updateError) {
                console.error("Error updating checklist execution:", updateError);
                throw updateError;
            }

            console.log("Checklist execution updated successfully");

            // 2. Aggiorna lo stato della manutenzione collegata
            if (execution?.schedule_id) {
                console.log("Updating maintenance schedule:", execution.schedule_id);

                // Recupera info complete dello schedule
                const { data: schedData } = await supabase
                    .from("maintenance_schedules")
                    .select("equipment_id, title, tenant_id, frequency, next_due_date")
                    .eq("id", execution.schedule_id)
                    .single();

                // Calcola prossima scadenza per manutenzioni ricorrenti
                const calcNextDueDate = (frequency: string | null, currentDue: string | null): string | null => {
                    if (!frequency) return null;
                    const base = currentDue ? new Date(currentDue) : new Date();
                    const now = new Date();
                    const start = base > now ? base : now;

                    const freqLower = frequency.toLowerCase();
                    if (freqLower === "daily" || freqLower === "giornaliera") {
                        start.setDate(start.getDate() + 1);
                    } else if (freqLower === "weekly" || freqLower === "settimanale") {
                        start.setDate(start.getDate() + 7);
                    } else if (freqLower === "biweekly" || freqLower === "bisettimanale") {
                        start.setDate(start.getDate() + 14);
                    } else if (freqLower === "monthly" || freqLower === "mensile") {
                        start.setMonth(start.getMonth() + 1);
                    } else if (freqLower === "quarterly" || freqLower === "trimestrale") {
                        start.setMonth(start.getMonth() + 3);
                    } else if (freqLower === "semiannual" || freqLower === "semestrale") {
                        start.setMonth(start.getMonth() + 6);
                    } else if (freqLower === "annual" || freqLower === "annuale" || freqLower === "yearly") {
                        start.setFullYear(start.getFullYear() + 1);
                    } else {
                        // Frequenza non riconosciuta, non rischedulare
                        return null;
                    }
                    return start.toISOString();
                };

                const nextDue = calcNextDueDate(schedData?.frequency || null, schedData?.next_due_date || null);
                const isRecurring = nextDue !== null;

                // Aggiorna schedule: se ricorrente → rischedula, altrimenti → completed
                const updatePayload: any = {
                    last_performed_at: new Date().toISOString(),
                };

                if (isRecurring) {
                    updatePayload.status = "scheduled";
                    updatePayload.next_due_date = nextDue;
                } else {
                    updatePayload.status = "completed";
                }

                const { error: maintenanceError } = await supabase
                    .from("maintenance_schedules")
                    .update(updatePayload)
                    .eq("id", execution.schedule_id);

                if (maintenanceError) {
                    console.error("Error updating maintenance schedule:", maintenanceError);
                } else {
                    console.log("Maintenance schedule updated:", isRecurring ? `rescheduled to ${nextDue}` : "completed");
                }

                // 3. Crea log di manutenzione
                const { data: { user } } = await supabase.auth.getUser();
                if (user && schedData) {
                    const { error: logError } = await supabase
                        .from("maintenance_logs")
                        .insert({
                            equipment_id: schedData.equipment_id,
                            performed_by: user.id,
                            title: schedData.title,
                            description: `Checklist "${checklist?.name}" completata${isRecurring ? `. Prossima: ${new Date(nextDue!).toLocaleDateString("it-IT")}` : ""}`,
                            status: "completed",
                            completed_at: new Date().toISOString(),
                            schedule_id: execution.schedule_id,
                            tenant_id: schedData.tenant_id,
                        });

                    if (logError) {
                        console.error("Error creating maintenance log:", logError);
                    }

                    // 4. Riporta lo stato dell'attrezzatura ad "active"
                    const { error: equipError } = await supabase
                        .from("equipment")
                        .update({ status: "active", updated_at: new Date().toISOString() })
                        .eq("id", schedData.equipment_id);

                    if (equipError) {
                        console.error("Error updating equipment status:", equipError);
                    }
                }
            } else {
                console.log("No schedule_id found, skipping maintenance update");
            }

            toast({
                title: "Successo",
                description: "Checklist completata con successo"
            });

            router.push("/maintenance");
        } catch (error: any) {
            console.error("Error completing checklist:", error);
            toast({
                title: "Errore",
                description: "Impossibile completare la checklist",
                variant: "destructive"
            });
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (!execution || !checklist) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                    <p className="text-muted-foreground">Esecuzione non trovata</p>
                    <Button onClick={() => router.push("/dashboard")}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Torna alla Dashboard
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const progress = calculateProgress();
    const startTime = execution.started_at ? new Date(execution.started_at) : new Date();

    // Colore barra: verde al 100%, primary (arancione) sotto
    const progressBarColor = progress === 100 ? "bg-green-500" : "bg-primary";
    const progressBadgeClass = progress === 100
        ? "bg-green-500/20 text-green-400 border-green-500/30"
        : "";

    return (
        <MainLayout>
            <SEO title={`Esegui Checklist - ${checklist?.name || ""}`} />

            <div className="space-y-6 pb-24">
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl text-foreground">{checklist.name}</CardTitle>
                                <p className="text-sm text-gray-400">Esecuzione checklist</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>Inizio: {format(startTime, "dd/MM/yyyy HH:mm")}</span>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-foreground">Progresso</CardTitle>
                            <Badge
                                variant={progress === 100 ? "default" : "secondary"}
                                className={`text-lg px-3 py-1 ${progressBadgeClass}`}
                            >
                                {progress}%
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                                className={`${progressBarColor} h-3 rounded-full transition-all duration-300`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <Card key={item.id} className="bg-gray-800 border-gray-700">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={item.checked}
                                            onCheckedChange={() => handleItemCheck(index)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`font-medium ${item.checked ? "text-green-400 line-through" : "text-foreground"}`}>
                                                    {item.title}
                                                </p>
                                                {item.is_required && (
                                                    <Badge variant="destructive">
                                                        <Flag className="h-3 w-3 mr-1" />
                                                        Richiesto
                                                    </Badge>
                                                )}
                                            </div>

                                            {item.description && (
                                                <p className="text-sm text-gray-400">{item.description}</p>
                                            )}

                                            {item.images && item.images.length > 0 && (
                                                <div className="space-y-2 mt-3">
                                                    <p className="text-xs text-gray-400 font-medium">Immagini di riferimento:</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {item.images.map((imageUrl, imgIndex) => (
                                                            <div key={imgIndex} className="relative group cursor-pointer">
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={`Riferimento ${imgIndex + 1}`}
                                                                    className="w-full h-24 object-cover rounded border border-gray-600 hover:border-primary transition-colors"
                                                                    onClick={() => window.open(imageUrl, '_blank')}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>Note</span>
                                                </div>
                                                <Textarea
                                                    value={item.notes || ""}
                                                    onChange={(e) => handleNoteChange(index, e.target.value)}
                                                    placeholder="Aggiungi note..."
                                                    className="bg-gray-900 border-gray-700 text-foreground placeholder:text-gray-500"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 border-t bg-gray-900 border-gray-800 p-4 safe-area-bottom">
                <div className="max-w-7xl mx-auto flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="flex-1 bg-gray-800 border-gray-700 text-foreground hover:bg-gray-700"
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Annulla
                    </Button>
                    <Button
                        onClick={handleComplete}
                        disabled={progress < 100 || completing}
                        className={`flex-1 ${progress === 100 ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"}`}
                    >
                        {completing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Completa
                    </Button>
                </div>
            </div>

            <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                <DialogContent className="bg-gray-800 border-gray-700 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Conferma il completamento della checklist</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Tecnico</p>
                                <p className="font-medium text-foreground">{technicianName}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Data e Ora</p>
                                <p className="font-medium text-foreground">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Durata</p>
                                <p className="font-medium text-foreground">
                                    {Math.round((new Date().getTime() - startTime.getTime()) / 1000 / 60)} minuti
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400">Checklist</p>
                                <p className="font-medium text-foreground">{checklist.name}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Nome Tecnico</label>
                            <Input
                                value={technicianName}
                                onChange={(e) => setTechnicianName(e.target.value)}
                                placeholder="Inserisci il tuo nome"
                                className="bg-gray-900 border-gray-700 text-foreground placeholder:text-gray-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Firma</label>
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-2 bg-gray-900">
                                <canvas
                                    ref={canvasRef}
                                    width={600}
                                    height={200}
                                    className="w-full touch-none cursor-crosshair bg-gray-900"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={stopDrawing}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearSignature}
                                className="w-full bg-gray-700 border-gray-600 text-foreground hover:bg-gray-600"
                            >
                                Cancella Firma
                            </Button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="saveSignature"
                                checked={saveSignature}
                                onCheckedChange={(checked) => setSaveSignature(checked as boolean)}
                            />
                            <label
                                htmlFor="saveSignature"
                                className="text-sm text-gray-300 cursor-pointer"
                            >
                                Salva la firma per utilizzi futuri
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSignatureDialog(false)}
                            className="bg-gray-700 border-gray-600 text-foreground hover:bg-gray-600"
                        >
                            Annulla
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmComplete}
                            disabled={completing || !technicianName.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {completing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Conferma e Invia
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
