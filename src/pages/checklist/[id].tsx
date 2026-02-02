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
}

interface ChecklistExecution {
    id: string;
    checklist_id: string;
    executed_by: string;
    status: string;
    results: Record<string, any>;
    notes: string | null;
    signature: string | null;
    started_at: string;
    completed_at: string | null;
    checklist: {
        name: string;
        description: string | null;
    } | null;
    executed_by_profile: {
        full_name: string;
    } | null;
}

export default function ChecklistExecutionPage() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [execution, setExecution] = useState<ChecklistExecution | null>(null);
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState<Record<string, boolean>>({});
    const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
    const [showNoteDialog, setShowNoteDialog] = useState<string | null>(null);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatureConfirmed, setSignatureConfirmed] = useState(false);
    const [finalNotes, setFinalNotes] = useState("");
    const [startTime] = useState(new Date());
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        if (id && typeof id === "string" && id !== "execute") {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(id)) {
                loadExecution(id);
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
            setElapsedTime(elapsed);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const loadExecution = async (executionId: string) => {
        try {
            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .select(`
                    *,
                    checklist:checklists!checklist_id(name, description),
                    executed_by_profile:profiles!checklist_executions_executed_by_fkey(full_name)
                `)
                .eq("id", executionId)
                .single();

            if (executionError) throw executionError;

            const { data: itemsData, error: itemsError } = await supabase
                .from("checklist_items")
                .select("*")
                .eq("checklist_id", executionData.checklist_id)
                .order("order_index");

            if (itemsError) throw itemsError;

            setExecution({
                ...executionData,
                checklist: executionData.checklist || { name: "N/A", description: null }
            } as ChecklistExecution);
            setItems(itemsData || []);

            if (executionData.results && typeof executionData.results === "object") {
                setResponses(executionData.results as Record<string, boolean>);
            }
        } catch (error: any) {
            console.error("Error loading execution:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare la checklist"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (itemId: string, checked: boolean) => {
        setResponses(prev => ({ ...prev, [itemId]: checked }));
    };

    const handleSkipItem = (itemId: string) => {
        setResponses(prev => {
            const newResponses = { ...prev };
            delete newResponses[itemId];
            return newResponses;
        });
    };

    const handleSaveNote = () => {
        if (showNoteDialog) {
            setShowNoteDialog(null);
        }
    };

    const completedCount = Object.keys(responses).length;
    const totalCount = items.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleCompleteClick = () => {
        setShowSignatureDialog(true);
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsDrawing(true);
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
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleFinalSubmit = async () => {
        if (!signatureConfirmed) {
            toast({
                variant: "destructive",
                title: "Conferma richiesta",
                description: "Conferma che tutte le attività sono state eseguite correttamente"
            });
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const signatureDataUrl = canvas.toDataURL();

        try {
            const { error } = await supabase
                .from("checklist_executions")
                .update({
                    results: responses,
                    signature: signatureDataUrl,
                    notes: finalNotes || null,
                    status: "completed",
                    completed_at: new Date().toISOString()
                })
                .eq("id", execution?.id);

            if (error) throw error;

            toast({
                title: "Completato!",
                description: "La checklist è stata completata con successo"
            });

            router.push("/maintenance");
        } catch (error) {
            console.error("Error completing checklist:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile completare la checklist"
            });
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </MainLayout>
        );
    }

    if (!execution) {
        return (
            <MainLayout>
                <div className="p-8 text-center">
                    <h2 className="text-xl font-semibold text-white">Checklist non trovata</h2>
                    <p className="text-muted-foreground mt-2">L'esecuzione della checklist richiesta non esiste.</p>
                    <Button className="mt-4" onClick={() => router.back()}>
                        Torna indietro
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <SEO title={`Esegui Checklist - ${execution.checklist?.name || ""}`} />
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Card */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white">
                            {execution.checklist?.name || "Checklist"}
                        </CardTitle>
                        <p className="text-slate-400">Esecuzione checklist</p>
                        <div className="flex items-center gap-2 text-blue-400 mt-2">
                            <Clock className="h-5 w-5" />
                            <span className="text-lg font-semibold">{formatTime(elapsedTime)}</span>
                        </div>
                    </CardHeader>
                </Card>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-white">Progresso</span>
                        <Badge variant="default" className="bg-green-600">
                            {progressPercentage}%
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {completedCount} di {totalCount} completati
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-600 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {items.map((item) => {
                        const isCompleted = responses[item.id] === true;

                        return (
                            <Card key={item.id} className={`bg-slate-800/50 border-slate-700 ${isCompleted ? "border-green-600 bg-green-950/20" : ""}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={isCompleted}
                                            onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className={`font-medium text-white ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                                    {item.title}
                                                </h3>
                                                {item.is_required && !isCompleted && (
                                                    <Badge variant="destructive" className="text-xs">Richiesto</Badge>
                                                )}
                                            </div>
                                            {item.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                            )}
                                            {isCompleted && (
                                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                    <span>✓</span> Completato alle {format(new Date(), "HH:mm")}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-3 ml-8">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-white"
                                            onClick={() => setShowNoteDialog(item.id)}
                                        >
                                            <Flag className="h-3 w-3 mr-1" />
                                            Segnala
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-white"
                                            onClick={() => setShowNoteDialog(item.id)}
                                        >
                                            <MessageSquare className="h-3 w-3 mr-1" />
                                            Aggiungi nota
                                        </Button>
                                        {!item.is_required && !isCompleted && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-muted-foreground"
                                                onClick={() => handleSkipItem(item.id)}
                                            >
                                                Salta
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <Dialog open={showNoteDialog !== null} onOpenChange={() => setShowNoteDialog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-white">Aggiungi nota</DialogTitle>
                        </DialogHeader>
                        <Textarea
                            placeholder="Inserisci le tue note qui..."
                            value={showNoteDialog ? (itemNotes[showNoteDialog] || "") : ""}
                            onChange={(e) => {
                                if (showNoteDialog) {
                                    setItemNotes(prev => ({ ...prev, [showNoteDialog]: e.target.value }));
                                }
                            }}
                            rows={4}
                        />
                        <DialogFooter>
                            <Button variant="outline" className="text-white border-slate-600" onClick={() => setShowNoteDialog(null)}>Annulla</Button>
                            <Button onClick={handleSaveNote}>Salva</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-white">Firma Digitale</DialogTitle>
                            <p className="text-sm text-muted-foreground">Conferma il completamento della checklist</p>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Tecnico</span>
                                    <div className="font-medium text-white">{execution.executed_by_profile?.full_name || "N/A"}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Data e Ora</span>
                                    <div className="font-medium text-white">{format(new Date(), "dd/MM/yyyy HH:mm")}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Durata</span>
                                    <div className="font-medium text-white">{formatTime(elapsedTime)}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Checklist</span>
                                    <div className="font-medium text-white">{execution.checklist?.name || "N/A"}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Inserisci il tuo nome completo</label>
                                <Input placeholder="Nome e Cognome" className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white">Firma qui</label>
                                    <Button variant="ghost" size="sm" className="text-white" onClick={clearSignature}>
                                        Cancella
                                    </Button>
                                </div>
                                <div className="border-2 border-dashed rounded-lg overflow-hidden bg-slate-700 border-slate-600">
                                    <canvas
                                        ref={canvasRef}
                                        width={460}
                                        height={200}
                                        className="cursor-crosshair w-full"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="confirm"
                                    checked={signatureConfirmed}
                                    onCheckedChange={(checked) => setSignatureConfirmed(checked as boolean)}
                                    className="border-slate-600"
                                />
                                <label htmlFor="confirm" className="text-sm cursor-pointer text-white">
                                    Confermo che tutte le attività sono state eseguite correttamente
                                </label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700" onClick={() => setShowSignatureDialog(false)}>
                                Annulla
                            </Button>
                            <Button onClick={handleFinalSubmit} disabled={!signatureConfirmed}>
                                Conferma e Invia
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        onClick={handleCompleteClick}
                    >
                        Completa e Firma
                    </Button>
                </div>
            </div>
        </MainLayout>
    );
}