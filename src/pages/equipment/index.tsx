import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Wrench,
  MapPin,
  Filter,
  ChevronRight,
  QrCode
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Equipment {
  id: string;
  name: string;
  equipment_code: string;
  category: string;
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  location: string | null;
  status: string;
  qr_code: string | null;
}

export default function EquipmentPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "technician">("technician");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserRole(profile.role as "admin" | "supervisor" | "technician");
        }

        const { data: equipmentData } = await supabase
          .from("equipment")
          .select("*")
          .order("name");

        if (equipmentData) {
          setEquipment(equipmentData);
          setFilteredEquipment(equipmentData);
          
          // Extract unique categories
          const uniqueCategories = [...new Set(equipmentData.map(e => e.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error("Error loading equipment:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    let filtered = equipment;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.serial_number?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.manufacturer?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    setFilteredEquipment(filtered);
  }, [searchQuery, statusFilter, categoryFilter, equipment]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      active: { label: t("equipment.active"), color: "bg-green-500/20 text-green-400 border-green-500/30" },
      under_maintenance: { label: t("equipment.maintenance"), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      inactive: { label: t("equipment.inactive"), color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
      retired: { label: t("equipment.decommissioned"), color: "bg-red-500/20 text-red-400 border-red-500/30" }
    };
    return configs[status] || configs.active;
  };

  if (loading) return null;

  return (
    <MainLayout userRole={userRole}>
      <SEO title={`${t("equipment.title")} - Maint Ops`} />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("equipment.title")}</h1>
            <p className="text-slate-400 mt-1">{t("equipment.subtitle")}</p>
          </div>
          {(userRole === "admin" || userRole === "supervisor") && (
            <Button 
              className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
              onClick={() => router.push("/equipment/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("equipment.addEquipment")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">{t("common.all")}</SelectItem>
                    <SelectItem value="active" className="text-white hover:bg-slate-700">{t("equipment.active")}</SelectItem>
                    <SelectItem value="under_maintenance" className="text-white hover:bg-slate-700">{t("equipment.maintenance")}</SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-slate-700">{t("equipment.inactive")}</SelectItem>
                    <SelectItem value="retired" className="text-white hover:bg-slate-700">{t("equipment.decommissioned")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder={t("equipment.category")} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">{t("common.all")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-white hover:bg-slate-700">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((item) => {
            const status = getStatusConfig(item.status);
            return (
              <Card
                key={item.id}
                className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => router.push(`/equipment/${item.id}`)}
              >
                {/* Image placeholder */}
                <div className="h-40 bg-slate-700/50 relative overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <Wrench className="w-12 h-12 text-slate-600" />
                  </div>
                  {item.qr_code && (
                    <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-lg">
                      <QrCode className="w-4 h-4 text-slate-800" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-white text-lg truncate flex-1">{item.name}</h3>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </div>

                  {item.location && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {item.category || t("equipment.generic")}
                    </span>
                    <Badge className={`rounded-md px-2 py-0.5 text-xs font-semibold border ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredEquipment.length === 0 && (
          <Card className="rounded-2xl border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
            <Wrench className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t("equipment.noEquipment")}</h3>
            <p className="text-slate-400 mb-6">{t("equipment.noEquipmentDesc")}</p>
            {(userRole === "admin" || userRole === "supervisor") && (
              <Button 
                className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                onClick={() => router.push("/equipment/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("equipment.addFirst")}
              </Button>
            )}
          </Card>
        )}
      </div>
    </MainLayout>
  );
}