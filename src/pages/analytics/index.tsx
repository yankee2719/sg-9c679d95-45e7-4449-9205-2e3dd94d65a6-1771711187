// src/pages/analytics/index.tsx

import { useEffect, useState, useMemo } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import QuickExportPanel from "@/components/dashboard/QuickExportPanel";
import UrgentIssuesPanel, { UrgentIssue } from "@/components/dashboard/UrgentIssuesPanel";

interface DashboardKpis {
    machineCount: number;
    customerCount: number;
    activeAssignments: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    activeChecklists: number;
    activeDocuments: number;
}

export default function AnalyticsPage() {
    const { language } = useLanguage();
    const { organization, membership } = useAuth();

    const orgId = organization?.id;
    const orgType = organization?.type;
    const userRole = membership?.role ?? "technician";

    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState < DashboardKpis > ({
        machineCount: 0,
        customerCount: 0,
        activeAssignments: 0,
        openWorkOrders: 0,
        overdueWorkOrders: 0,
        activeChecklists: 0,
        activeDocuments: 0,
    });

    useEffect(() => {
        const load = async () => {
            if (!orgId) return;

            try {
                const [
                    machines,
                    workOrders,
                    documents,
                    checklists,
                    assignments,
                ] = await Promise.all([
                    supabase.from("machines").select("id").eq("organization_id", orgId),
                    supabase.from("work_orders").