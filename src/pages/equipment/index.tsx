import { useEffect, useState } from "react";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { getAllEquipment } from "@/services/equipmentService";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, QrCode, FileText, Settings, Loader2, Wrench } from "lucide-react";
import { useRouter } from "next/router";

export default function EquipmentListPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const profile = await userService.getUserById(user.id);
        setUserRole(profile.role as "admin" | "supervisor" | "technician");
        await loadEquipment();
      } catch (error) {
        console.error("Error initializing page:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const loadEquipment = async () => {
    try {
      const data = await getAllEquipment();
      setEquipment(data);
    } catch (error) {
      console.error("Error loading equipment:", error);
    }
  };

  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      active: { label: "Attiva", className: "bg-green-500/10 text-green-400 border-green-500/20" },
      under_maintenance: { label: "In Manutenzione", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
      inactive: { label: "Inattiva", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
      decommissioned: { label: "Dismessa", className: "bg-red-500/10 text-red-400 border-red-500/20" }
    };
    return config[status] || config.active;
  };

  const canModify = userRole === "admin" || userRole === "supervisor";

  if (loading) {
    return (
      <MainLayout userRole="admin">
        <SEO title="Caricamento..." />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userRole="admin">
      <SEO title="Equipment - Industrial Maintenance" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Anagrafica Macchine</h1>
            <p className="text-slate-400">Gestisci il parco macchine e attrezzature</p>
          </div>
          {canModify && (
            <Button 
              asChild
              className="bg-[#FF6B35] hover:bg-[#FF8C61] text-white rounded-xl px-6"
            >
              <Link href="/equipment/new">
                <Plus className="mr-2 h-5 w-5" />
                Nuova Macchina
              </Link>
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Totale</p>
                  <p className="text-3xl font-bold text-white">{equipment.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Attive</p>
                  <p className="text-3xl font-bold text-white">
                    {equipment.filter(e => e.status === 'active').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">In Manutenzione</p>
                  <p className="text-3xl font-bold text-white">
                    {equipment.filter(e => e.status === 'under_maintenance').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-[#FF6B35]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Inattive</p>
                  <p className="text-3xl font-bold text-white">
                    {equipment.filter(e => e.status === 'inactive' || e.status === 'decommissioned').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-500/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment List */}
        <Card className="rounded-2xl border-slate-700/50 bg-slate-800/50">
          <CardHeader className="border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input
                placeholder="Cerca per nome, codice o seriale..."
                className="pl-11 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>Nessuna macchina trovata</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableHead className="text-slate-400 font-semibold">Codice</TableHead>
                      <TableHead className="text-slate-400 font-semibold">Nome</TableHead>
                      <TableHead className="text-slate-400 font-semibold">Categoria</TableHead>
                      <TableHead className="text-slate-400 font-semibold">Stato</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map((item) => {
                      const statusConfig = getStatusBadge(item.status);
                      return (
                        <TableRow 
                          key={item.id}
                          className="border-slate-700/50 hover:bg-slate-800/30 cursor-pointer"
                          onClick={() => router.push(`/equipment/${item.id}`)}
                        >
                          <TableCell className="font-mono font-semibold text-white">
                            {item.code}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-xs text-slate-400">
                                {item.manufacturer} {item.model}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-400 border-blue-500/20">
                              {item.equipment_categories?.name || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`rounded-full border ${statusConfig.className}`}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/equipment/${item.id}`);
                                }}
                                className="h-9 w-9 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                title="Dettagli"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="h-9 w-9 rounded-lg text-slate-400 hover:text-[#FF6B35] hover:bg-orange-500/10"
                                title="QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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