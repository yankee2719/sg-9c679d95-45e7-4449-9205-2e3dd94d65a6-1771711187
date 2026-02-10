// src/pages/equipment/[id].tsx
// Esempio di pagina dettaglio macchina con Timeline
// Compatible with Next.js Pages Router

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineEventTimeline } from '@/components/MachineEventTimeline';

interface Equipment {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    serial_number: string;
    manufacturer: string;
    model: string;
    status: string;
    location: string;
}

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { id } = router.query;

    const [equipment, setEquipment] = useState < Equipment | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadEquipment(id as string);
        }
    }, [id]);

    async function loadEquipment(equipmentId: string) {
        try {
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .eq('id', equipmentId)
                .single();

            if (error) throw error;
            setEquipment(data);
        } catch (error) {
            console.error('Failed to load equipment:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center text-red-600">
                    Equipment not found
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Equipment Details Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold mb-4">{equipment.name}</h1>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-gray-600">Code:</span>
                        <span className="ml-2 font-medium">{equipment.code}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Serial Number:</span>
                        <span className="ml-2 font-medium">{equipment.serial_number}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="ml-2 font-medium">{equipment.manufacturer}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Model:</span>
                        <span className="ml-2 font-medium">{equipment.model}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Location:</span>
                        <span className="ml-2 font-medium">{equipment.location}</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Status:</span>
                        <span className="ml-2 font-medium">{equipment.status}</span>
                    </div>
                </div>
            </div>

            {/* Event Timeline */}
            <MachineEventTimeline
                machineId={equipment.id}
                organizationId={equipment.organization_id}
                limit={50}
                showIntegrityCheck={true}
            />
        </div>
    );
}
