import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { checklistService } from "@/services/checklistService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Search, Plus, Edit } from "lucide-react";

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await checklistService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout userRole="admin">
      <SEO title="Template Checklist - Industrial Maintenance" />
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Template Checklist</h1>
            <p className="text-muted-foreground mt-1">
              Gestisci i template per le checklist di manutenzione
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Link href="/checklists/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Template
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Caricamento...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun template trovato
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <ClipboardList className="h-8 w-8 text-blue-600" />
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? "Attivo" : "Inattivo"}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.description || "Nessuna descrizione"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{template.checklist_items?.length || 0} items</span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/checklists/${template.id}`}>
                            <Edit className="h-3 w-3 mr-1" />
                            Modifica
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}