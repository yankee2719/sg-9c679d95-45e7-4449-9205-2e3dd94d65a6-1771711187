// ============================================================================
// EQUIPMENT MAINTENANCE PAGE
// ============================================================================
// File: pages/equipment/[id]/maintenance.tsx
// Pagina completa per gestione manutenzione equipment
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { WorkOrderList } from '@/components/Maintenance/WorkOrderList';
import { WorkOrderForm } from '@/components/Maintenance/WorkOrderForm';
import { WorkOrderDetail } from '@/components/Maintenance/WorkOrderDetail';
import { MaintenancePlanList } from '@/components/Maintenance/MaintenancePlanList';
import { MaintenancePlanForm } from '@/components/Maintenance/MaintenancePlanForm';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Plus, Wrench, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import { WorkOrder, MaintenancePlan } from '@/services/maintenanceService';

export default function EquipmentMaintenancePage() {
    const router = useRouter();
    const { id: equipmentId } = router.query;
    const { user, loading: authLoading } = useCurrentUser();

    // State
    const [showCreateWO, setShowCreateWO] = useState(false);
    const [showCreatePlan, setShowCreatePlan] = useState(false);
    const [selectedWO, setSelectedWO] = useState < WorkOrder | null > (null);
    const [selectedPlan, setSelectedPlan] = useState < MaintenancePlan | null > (null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Equipment data (mock - replace with real fetch)
    const equipment = {
        id: equipmentId as string,
        name: 'CNC Machine #5',
        plant_id: 'plant-uuid-123',
    };

    // --------------------------------------------------------------------------
    // HANDLERS
    // --------------------------------------------------------------------------

    const handleCreateWorkOrder = async (data: any) => {
        const res = await fetch('/api/work-orders', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            setShowCreateWO(false);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const handleWorkOrderStatusChange = async (woId: string, newStatus: string, reason?: string) => {
        const res = await fetch(`/api/work-orders/${woId}/transition`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_status: newStatus, reason }),
        });

        if (res.ok) {
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const handleUpdateWorkOrder = async (woId: string, updates: any) => {
        const res = await fetch(`/api/work-orders/${woId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });

        return res.ok;
    };

    const handleCreatePlan = async (data: any) => {
        const res = await fetch('/api/maintenance-plans', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (res.ok) {
            setShowCreatePlan(false);
            setRefreshTrigger(prev => prev + 1);
        }
    };

    const handleGenerateWorkOrder = async (planId: string) => {
        // Logic to generate WO from plan
        console.log('Generate WO from plan:', planId);
    };

    // --------------------------------------------------------------------------
    // LOADING / AUTH
    // --------------------------------------------------------------------------

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    if (!equipmentId || typeof equipmentId !== 'string') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // --------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/equipment/${equipmentId}`)}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Wrench className="h-8 w-8" />
                            Maintenance
                        </h1>
                        <p className="text-gray-500 mt-1">{equipment.name}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setShowCreatePlan(true)} variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        New Plan
                    </Button>
                    <Button onClick={() => setShowCreateWO(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Work Order
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="work-orders" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
                    <TabsTrigger value="plans">Maintenance Plans</TabsTrigger>
                </TabsList>

                <TabsContent value="work-orders">
                    <WorkOrderList
                        equipmentId={equipmentId}
                        key={refreshTrigger}
                        onViewWorkOrder={(wo) => setSelectedWO(wo)}
                        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                    />
                </TabsContent>

                <TabsContent value="plans">
                    <MaintenancePlanList
                        equipmentId={equipmentId}
                        onEdit={(plan) => setSelectedPlan(plan)}
                        onGenerateWorkOrder={handleGenerateWorkOrder}
                    />
                </TabsContent>
            </Tabs>

            {/* Create Work Order Dialog */}
            <Dialog open={showCreateWO} onOpenChange={setShowCreateWO}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Work Order</DialogTitle>
                    </DialogHeader>
                    <WorkOrderForm
                        equipmentId={equipmentId}
                        plantId={equipment.plant_id}
                        onSubmit={handleCreateWorkOrder}
                        onCancel={() => setShowCreateWO(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Work Order Detail Dialog */}
            {selectedWO && (
                <Dialog open={!!selectedWO} onOpenChange={() => setSelectedWO(null)}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Work Order Details</DialogTitle>
                        </DialogHeader>
                        <WorkOrderDetail
                            workOrder={selectedWO}
                            onStatusChange={(newStatus, reason) =>
                                handleWorkOrderStatusChange(selectedWO.id, newStatus, reason)
                            }
                            onUpdate={(updates) => handleUpdateWorkOrder(selectedWO.id, updates)}
                            onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {/* Create Plan Dialog */}
            <Dialog open={showCreatePlan} onOpenChange={setShowCreatePlan}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Maintenance Plan</DialogTitle>
                    </DialogHeader>
                    <MaintenancePlanForm
                        equipmentId={equipmentId}
                        plantId={equipment.plant_id}
                        onSubmit={handleCreatePlan}
                        onCancel={() => setShowCreatePlan(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
