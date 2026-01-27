import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { equipmentService } from "@/services/equipmentService";
import { userService } from "@/services/userService";
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
import { Plus, Search, QrCode, FileText, Settings, Loader2 } from "lucide-react";

export default function EquipmentListPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadEquipment();
    checkUserRole();
  }, []);

  const loadEquipment = async () => {
    try {
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (error) {
      console.error("Error loading equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRole = async () => {
    const user = await userService.getCurrentUser();
    if (user?.role === "admin") setIsAdmin(true);
  };

  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout userRole={isAdmin ? "admin" : "technician"}>
      <SEO title="Macchine e Attrezzature - Industrial Maintenance" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Anagrafica Macchine</h1>
            <p className="text-muted-foreground mt-1">
              Gestisci il parco macchine
            </p>
          </div>
          <Link href="/equipment/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuova Macchina
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, codice o seriale..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Ultima Manutenzione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessuna macchina trovata
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEquipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-medium">{item.code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.manufacturer} {item.model}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.equipment_categories?.name || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              item.status === 'active' ? 'bg-green-500' :
                              item.status === 'under_maintenance' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }>
                              {item.status === 'active' ? 'Attiva' :
                               item.status === 'under_maintenance' ? 'In Manutenzione' :
                               item.status === 'inactive' ? 'Inattiva' : 'Dismessa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            -
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild title="Dettagli">
                                <Link href={`/equipment/${item.id}`}>
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" title="QR Code">
                                <QrCode className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" title="Modifica">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}