// src/pages/equipment/[id].tsx
// Pagina dettaglio attrezzatura con Timeline Eventi
// Compatible with Next.js Pages Router

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MachineEventTimeline } from '@/components/MachineEventTimeline';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, QrCode, Wrench } from 'lucide-react';
import Link from 'next/link';

interface Equipment {
    id: string;
    tenant_id: string | null;
    name: string;
    equipment_code: string;
    serial_number: string | null;
    manufacturer: string | null;
    model: string | null;
    status: string;
    location: string | null;
    category: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    notes: string | null;
    image_url: string | null;
    qr_code: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    under_maintenance: 'bg-yellow-100 text-yellow-800',
    decommissioned: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Attivo',
    inactive: 'Inattivo',
    under_maintenance: 'In Manutenzione',
    decommissioned: 'Dismesso',
};

export default function EquipmentDetailPage() {
    const router = useRouter();
    const { id } = router.query;

    const [equipment, setEquipment] = useState < Equipment | null > (null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && typeof id === 'string') {
            loadEquipment(id);
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
            <MainLayout>
                <div className="container mx-auto p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!equipment) {
        return (
            <MainLayout>
                <div className="container mx-auto p-6">
                    <div className="text-center py-12">
                        <h2 className="text-xl font-semibold text-gray-900">Attrezzatura non trovata</h2>
                        <p className="mt-2 text-gray-600">L'attrezzatura richiesta non esiste o è stata eliminata.</p>
                        <Link href="/equipment">
                            <Button className="mt-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Torna alla lista
                            </Button>
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/equipment">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{equipment.name}</h1>
                            <p className="text-gray-500">Codice: {equipment.equipment_code}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/equipment/edit/${equipment.id}`}>
                            <Button variant="outline">
                                <Edit className="h-4 w-4 mr-2" />
                                Modifica
                            </Button>
                        </Link>
                        <Link href={`/maintenance/new?equipment_id=${equipment.id}`}>
                            <Button>
                                <Wrench className="h-4 w-4 mr-2" />
                                Nuova Manutenzione
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Equipment Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Dettagli Attrezzatura</span>
                            <Badge className={STATUS_COLORS[equipment.status] || 'bg-gray-100'}>
                                {STATUS_LABELS[equipment.status] || equipment.status}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <span className="text-sm text-gray-500">Codice</span>
                                <p className="font-medium">{equipment.equipment_code}</p>
                            </div>
                            {equipment.serial_number && (
                                <div>
                                    <span className="text-sm text-gray-500">Numero Seriale</span>
                                    <p className="font-medium">{equipment.serial_number}</p>
                                </div>
                            )}
                            {equipment.manufacturer && (
                                <div>
                                    <span className="text-sm text-gray-500">Produttore</span>
                                    <p className="font-medium">{equipment.manufacturer}</p>
                                </div>
                            )}
                            {equipment.model && (
                                <div>
                                    <span className="text-sm text-gray-500">Modello</span>
                                    <p className="font-medium">{equipment.model}</p>
                                </div>
                            )}
                            {equipment.category && (
                                <div>
                                    <span className="text-sm text-gray-500">Categoria</span>
                                    <p className="font-medium">{equipment.category}</p>
                                </div>
                            )}
                            {equipment.location && (
                                <div>
                                    <span className="text-sm text-gray-500">Ubicazione</span>
                                    <p className="font-medium">{equipment.location}</p>
                                </div>
                            )}
                            {equipment.purchase_date && (
                                <div>
                                    <span className="text-sm text-gray-500">Data Acquisto</span>
                                    <p className="font-medium">
                                        {new Date(equipment.purchase_date).toLocaleDateString('it-IT')}
                                    </p>
                                </div>
                            )}
                            {equipment.warranty_expiry && (
                                <div>
                                    <span className="text-sm text-gray-500">Scadenza Garanzia</span>
                                    <p className="font-medium">
                                        {new Date(equipment.warranty_expiry).toLocaleDateString('it-IT')}
                                    </p>
                                </div>
                            )}
                            {equipment.qr_code && (
                                <div>
                                    <span className="text-sm text-gray-500">QR Code</span>
                                    <p className="font-medium flex items-center gap-2">
                                        <QrCode className="h-4 w-4" />
                                        {equipment.qr_code}
                                    </p>
                                </div>
                            )}
                        </div>
                        {equipment.notes && (
                            <div className="mt-6 pt-6 border-t">
                                <span className="text-sm text-gray-500">Note</span>
                                <p className="mt-1">{equipment.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Event Timeline - solo se tenant_id è valido */}
                {equipment.tenant_id && (
                    <MachineEventTimeline
                        machineId={equipment.id}
                        organizationId={equipment.tenant_id}
                        limit={50}
                        showIntegrityCheck={true}
                    />
                )}
            </div>
        </MainLayout>
    );
}
