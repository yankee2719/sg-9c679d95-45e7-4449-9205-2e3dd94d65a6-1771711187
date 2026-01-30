import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ChecklistExecution {
    id: string;
    template_id: string;
    equipment_id: string;
    executed_by: string;
    started_at: string;
    status: string;
    checklist_templates: {
        name: string;
    } | null;
    equipment: {
        name: string;
        equipment_code: string;
    } | null;
    profiles: {
        full_name: string;
    } | null;
}

export default function ChecklistExecutionsAnalytics() {
    const [executions, setExecutions] = useState < ChecklistExecution[] > ([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState("30");

    useEffect(() => {
        loadExecutions();
    }, [timeRange]);

    const loadExecutions = async () => {
        try {
            setLoading(true);
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

            const { data, error } = await supabase
                .from("checklist_executions")
                .select(`
          *,
          checklist_templates (name),
          equipment (name, equipment_code),
          profiles (full_name)
        `)
                .gte("started_at", daysAgo.toISOString())
                .order("started_at", { ascending: false });

            if (error) throw error;
            setExecutions(data as unknown as ChecklistExecution[] || []);
        } catch (error) {
            console.error("Error loading executions:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20";
            case "in_progress":
                return "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20";
            case "failed":
                return "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20";
            default:
                return "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/20";
        }
    };

    const stats = {
        total: executions.length,
        completed: executions.filter(e => e.status === "completed").length,
        inProgress: executions.filter(e => e.status === "in_progress").length,
        failed: executions.filter(e => e.status === "failed").length,
    };

    const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <MainLayout>
            <SEO title="Checklist Analytics" />
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Analytics</h1>
                        <p className="text-slate-400 mt-2">Checklist execution performance</p>
                    </div>
                    <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>

                <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Time Range:</span>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="365">Last Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-slate-400">Total Executions</div>
                            <div className="text-3xl font-bold text-white mt-2">{stats.total}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-slate-400">Completed</div>
                            <div className="text-3xl font-bold text-green-400 mt-2">{stats.completed}</div>
                            <div className="text-xs text-slate-500 mt-1">{successRate}% success rate</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-slate-400">In Progress</div>
                            <div className="text-3xl font-bold text-blue-400 mt-2">{stats.inProgress}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="text-sm font-medium text-slate-400">Failed</div>
                            <div className="text-3xl font-bold text-red-400 mt-2">{stats.failed}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Executions */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Executions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-slate-400">Loading...</div>
                        ) : executions.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">No executions found</div>
                        ) : (
                            <div className="space-y-3">
                                {executions.map((execution) => (
                                    <div
                                        key={execution.id}
                                        className="flex items-center justify-between p-4 border border-slate-700/50 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-white">
                                                {execution.checklist_templates?.name || "Unknown Checklist"}
                                            </div>
                                            <div className="text-sm text-slate-400 mt-1">
                                                Equipment: {execution.equipment?.name || "N/A"} ({execution.equipment?.equipment_code || "N/A"})
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                Executed by: {execution.profiles?.full_name || "Unknown"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm text-slate-400">
                                                {execution.started_at ? format(new Date(execution.started_at), "MMM dd, HH:mm") : "N/A"}
                                            </div>
                                            <Badge className={getStatusColor(execution.status)}>
                                                {execution.status?.replace("_", " ") || "unknown"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}