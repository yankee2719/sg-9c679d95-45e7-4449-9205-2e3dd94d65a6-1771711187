import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, FileText, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistExecution {
    id: string;
    checklist_id: string;
    checklist: {
        name: string;
        description: string;
    } | null;
    responses: Record<string, any>;
    notes: string | null;
    signature: string | null;
    completed_at: string | null;
    created_at: string;
    executed_by_profile: {
        full_name: string;
        email: string;
    } | null;
    equipment: {
        name: string;
        equipment_code: string;
    } | null;
    checklist_items: {
        id: string;
        title: string;
        description: string | null;
        input_type?: string;
        order_index: number;
    }[];
}

export default function ChecklistExecutionDetail() {
    const router = useRouter();
    const { id } = router.query;
    const { toast } = useToast();
    const [execution, setExecution] = useState < ChecklistExecution | null > (null);
    const [loading, setLoading] = useState(true);

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

    const loadExecution = async (executionId: string) => {
        try {
            const { data: executionData, error: executionError } = await supabase
                .from("checklist_executions")
                .select(`
                    *,
                    checklist:checklists(name, description),
                    equipment(name, equipment_code),
                    executed_by_profile:profiles!checklist_executions_executed_by_fkey(full_name, email)
                `)
                .eq("id", executionId)
                .single();

            if (executionError) throw executionError;

            const { data: itemsData, error: itemsError } = await supabase
                .from("checklist_items")
                .select("id, title, description, input_type, order_index")
                .eq("checklist_id", executionData.checklist_id)
                .order("order_index");

            if (itemsError) throw itemsError;

            const responsesData = executionData.results as Record<string, any> || {};

            // Validate equipment data - check for null and validate structure
            let equipmentData: { name: string; equipment_code: string } | null = null;
            
            if (executionData.equipment && typeof executionData.equipment === 'object') {
                const eq = executionData.equipment as any;
                if (eq.name && eq.equipment_code) {
                    equipmentData = {
                        name: eq.name,
                        equipment_code: eq.equipment_code
                    };
                }
            }

            setExecution({
                ...executionData,
                responses: responsesData,
                checklist_items: itemsData || [],
                executed_by_profile: executionData.executed_by_profile || { full_name: 'Unknown', email: '' },
                equipment: equipmentData
            } as ChecklistExecution);

        } catch (error: any) {
            console.error("Error loading execution:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load checklist details"
            });
        } finally {
            setLoading(false);
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
                    <h2 className="text-xl font-semibold">Checklist Execution Not Found</h2>
                    <p className="text-muted-foreground mt-2">The requested checklist record could not be found.</p>
                </div>
            </MainLayout>
        );
    }

    const renderResponseValue = (item: any, value: any) => {
        if (value === undefined || value === null) return <span className="text-muted-foreground italic">No response</span>;

        const inputType = item.input_type || 'checkbox';
        
        switch (inputType) {
            case "checkbox":
                return value ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Pass</Badge>
                ) : (
                    <Badge variant="destructive">Fail</Badge>
                );
            case "photo":
                return (
                    <div className="mt-2">
                        <img src={value} alt="Response" className="max-w-[200px] rounded-md border" />
                    </div>
                );
            default:
                return <span className="font-medium">{String(value)}</span>;
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{execution.checklist?.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <Badge variant="outline" className="gap-1">
                                <User className="h-3 w-3" />
                                {execution.executed_by_profile?.full_name}
                            </Badge>
                            <span>•</span>
                            <span>{format(new Date(execution.created_at), "PPP p")}</span>
                        </div>
                    </div>
                    <Badge variant="default" className="text-base px-4 py-1 bg-green-600 hover:bg-green-700">
                        Completed
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Responses
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {execution.checklist_items.map((item, index) => {
                                    const response = execution.responses?.[item.id];
                                    return (
                                        <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-sm text-muted-foreground font-mono mr-2">#{index + 1}</span>
                                                    <span className="font-medium">{item.title}</span>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground mt-1 ml-6">{item.description}</p>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    {renderResponseValue(item, response)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {execution.notes && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Additional Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap">{execution.notes}</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Execution Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {execution.equipment && (
                                    <div>
                                        <span className="text-sm text-muted-foreground block">Equipment</span>
                                        <div className="font-medium">{execution.equipment.name}</div>
                                        <div className="text-sm text-muted-foreground">{execution.equipment.equipment_code}</div>
                                    </div>
                                )}

                                <Separator />

                                <div>
                                    <span className="text-sm text-muted-foreground block">Completed At</span>
                                    <div className="font-medium">
                                        {execution.completed_at ? format(new Date(execution.completed_at), "PPP p") : "N/A"}
                                    </div>
                                </div>

                                {execution.signature && (
                                    <>
                                        <Separator />
                                        <div>
                                            <span className="text-sm text-muted-foreground block mb-2">Technician Signature</span>
                                            <div className="bg-muted/30 p-2 rounded border border-dashed">
                                                <img src={execution.signature} alt="Signature" className="max-h-20 opacity-80" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}