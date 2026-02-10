import { useRouter } from 'next/router';
import { useState } from 'react';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { DocumentList } from '@/components/documents/DocumentList';
import { ComplianceDashboard } from '@/components/documents/ComplianceDashboard';
import { DocumentDetailModal } from '@/components/documents/DocumentDetailModal';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EquipmentDocumentsPage() {
    const router = useRouter();
    const { id } = router.query;

    const [selectedDocumentId, setSelectedDocumentId] = useState < string | null > (null);
    const [selectedCategory, setSelectedCategory] = useState('TECH_MANUAL');
    const [refreshKey, setRefreshKey] = useState(0);

    // Loading state mentre Next.js carica il router
    if (!router.isReady) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    // Validazione ID
    if (!id || typeof id !== 'string') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">ID equipaggiamento non valido</p>
                    <Link
                        href="/equipment"
                        className="text-blue-600 hover:text-blue-700 underline"
                    >
                        Torna alla lista equipaggiamenti
                    </Link>
                </div>
            </div>
        );
    }

    function handleUploadSuccess() {
        setRefreshKey(prev => prev + 1);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href={`/equipment/${id}`}
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Torna all'equipaggiamento
                    </Link>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <FileText className="w-8 h-8 text-blue-600" />
                                Gestione Documenti
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Carica e gestisci i documenti tecnici dell'equipaggiamento
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Upload & Compliance */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Compliance Dashboard */}
                        <ComplianceDashboard organizationId={id} />

                        {/* Category Selector */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoria Documento
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  bg-white text-gray-900"
                            >
                                <option value="TECH_MANUAL">Manuale Tecnico</option>
                                <option value="CE_DECLARATION">Dichiarazione CE</option>
                                <option value="RISK_ASSESSMENT">Valutazione Rischi</option>
                                <option value="WIRING_DIAGRAM">Schema Elettrico</option>
                                <option value="PNEUMATIC_DIAGRAM">Schema Pneumatico</option>
                                <option value="HYDRAULIC_DIAGRAM">Schema Idraulico</option>
                                <option value="SPARE_PARTS">Catalogo Ricambi</option>
                                <option value="MAINTENANCE_LOG">Registro Manutenzioni</option>
                                <option value="INSPECTION_REPORT">Rapporto Ispezione</option>
                                <option value="INSTALLATION_MANUAL">Manuale Installazione</option>
                                <option value="SAFETY_PROCEDURE">Procedura Sicurezza</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500">
                                Seleziona la categoria appropriata per il documento da caricare
                            </p>
                        </div>

                        {/* Document Uploader */}
                        <DocumentUploader
                            organizationId={id}
                            categoryCode={selectedCategory}
                            onSuccess={handleUploadSuccess}
                        />
                    </div>

                    {/* Right Column - Document List */}
                    <div className="lg:col-span-2">
                        <DocumentList
                            key={refreshKey}
                            organizationId={id}
                            onDocumentClick={setSelectedDocumentId}
                            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
                        />
                    </div>
                </div>

                {/* Info Card - Best Practices */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                        📋 Best Practices Documentazione
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Mantieni sempre aggiornati i documenti CE obbligatori</li>
                        <li>• Usa nomi file descrittivi e include versione/data</li>
                        <li>• Aggiungi sempre una descrizione dettagliata del cambiamento quando carichi nuove versioni</li>
                        <li>• Verifica il checksum SHA-256 dopo il download per garantire l'integrità del file</li>
                        <li>• Conserva tutte le versioni precedenti per tracciabilità normativa</li>
                    </ul>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedDocumentId && (
                <DocumentDetailModal
                    documentId={selectedDocumentId}
                    onClose={() => setSelectedDocumentId(null)}
                />
            )}
        </div>
    );
}
