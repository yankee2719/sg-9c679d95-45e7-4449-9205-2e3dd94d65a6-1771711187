import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { checklistService } from "@/services/checklistService";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function ExecuteChecklist() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [execution, setExecution] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    if (id) {
      loadExecution();
    }
  }, [id]);

  const loadExecution = async () => {
    try {
      const data = await checklistService.getExecutionById(id as string);
      setExecution(data);
      
      // Get template items
      const template = await checklistService.getTemplateById(data.template_id);
      setItems(template.items || []);

      // Load existing responses
      const existingResponses: Record<string, any> = {};
      data.items?.forEach((item: any) => {
        existingResponses[item.template_item_id] = item;
      });
      setResponses(existingResponses);
    } catch (error) {
      console.error("Error loading execution:", error);
      toast({
        title: "Error",
        description: "Failed to load checklist execution",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (itemId: string, field: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleSave = async (complete: boolean = false) => {
    setSubmitting(true);
    try {
      // Save all responses
      for (const item of items) {
        const response = responses[item.id];
        if (response) {
          await checklistService.updateExecutionItem(
            id as string,
            item.id,
            {
              is_completed: response.is_completed || false,
              actual_value: response.actual_value,
              notes: response.notes
            }
          );
        }
      }

      if (complete) {
        await checklistService.completeExecution(id as string, "Completed by technician");
        toast({
          title: "Success",
          description: "Checklist completed successfully",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "Saved",
          description: "Progress saved successfully",
        });
      }
    } catch (error) {
      console.error("Error saving checklist:", error);
      toast({
        title: "Error",
        description: "Failed to save checklist",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;
  if (!execution) return <MainLayout>Checklist not found</MainLayout>;

  return (
    <MainLayout>
      <SEO title="Execute Checklist" />
      
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{execution.template?.title}</h1>
              <p className="text-gray-500">
                Equipment: {execution.equipment?.name} ({execution.equipment?.equipment_code})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
            <Button onClick={() => handleSave(true)} disabled={submitting}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={item.id}>
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium flex gap-2">
                  <span className="text-gray-500">#{index + 1}</span>
                  {item.description}
                  {item.is_required && <span className="text-red-500">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`check-${item.id}`}
                      checked={responses[item.id]?.is_completed || false}
                      onCheckedChange={(checked) => handleResponseChange(item.id, "is_completed", checked)}
                    />
                    <Label htmlFor={`check-${item.id}`}>Completed</Label>
                  </div>
                  
                  {item.expected_value && (
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Value</Label>
                      <Input 
                        placeholder="Enter value" 
                        value={responses[item.id]?.actual_value || ""}
                        onChange={(e) => handleResponseChange(item.id, "actual_value", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {item.requires_note && (
                  <div>
                    <Label className="text-xs text-gray-500">Notes</Label>
                    <Textarea 
                      placeholder="Add notes..." 
                      className="h-20"
                      value={responses[item.id]?.notes || ""}
                      onChange={(e) => handleResponseChange(item.id, "notes", e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}