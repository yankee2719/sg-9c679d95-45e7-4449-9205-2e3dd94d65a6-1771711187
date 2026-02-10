'use client';

import { CheckCircle, AlertCircle, FileText, AlertTriangle } from 'lucide-react';
import { useCompliance } from '@/hooks/useCompliance';

interface ComplianceDashboardProps {
    organizationId: string;
    className?: string;
}

export function ComplianceDashboard({ organizationId, className = '' }: ComplianceDashboardProps) {
    const { status, loading, error, stats, refresh } = useCompliance(organizationId);

    if (loading) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-20 bg-gray-100 rounded" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
                <p className="text-red-800 text-sm">Errore nel caricamento dello stato compliance</p>
                <button
                    onClick={refresh}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                >
                    Riprova
                </button>
            </div>
        );
    }

    const { compliantCount, missingCount, totalRequired, compliancePercentage, isFullyCompliant } = stats;

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Stato Compliance CE
                    </h3>
                    <button
                        onClick={refresh}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        Aggiorna
                    </button>
                </div>

                {/* Progress Summary */}
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Documenti Obbligatori CE
                            </p>
                            <p className="text-3xl font-bold text-gray-900">
                                {compliantCount}
                                <span className="text-lg text-gray-600 font-normal">/{totalRequired}</span>
                            </p>
                        </div>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isFullyCompliant
                                ? 'bg-green-500'
                                : compliancePercentage >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                            }`}>
                            <span className="text-2xl font-bold text-white">
                                {compliancePercentage}%
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative">
                        <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ease-out ${isFullyCompliant
                                        ? 'bg-green-600'
                                        : compliancePercentage >= 50
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                    }`}
                                style={{ width: `${compliancePercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="mt-3 flex items-center gap-2">
                        {isFullyCompliant ? (
                            <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-medium text-green-700">
                                    Conformità CE completa ✓
                                </p>
                            </>
                        ) : missingCount > 0 ? (
                            <>
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <p className="text-sm font-medium text-amber-700">
                                    Mancano {missingCount} {missingCount === 1 ? 'documento' : 'documenti'}
                                </p>
                            </>
                        ) : null}
                    </div>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Documenti Richiesti
                    </p>

                    {status.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                            Nessun documento CE obbligatorio trovato
                        </p>
                    ) : (
                        status.map((item) => (
                            <div
                                key={item.category_code}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${item.compliance_status === 'compliant'
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {item.compliance_status === 'compliant' ? (
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-white" />
                                        </div>
                                    ) : (
                                        <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-white" />
                                        </div>
                                    )}

                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {item.category_name_it}
                                        </p>
                                        <p className="text-xs text-gray-600 font-mono">
                                            {item.category_code}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {item.active_count > 0 && (
                                        <span className="text-sm text-gray-600">
                                            {item.active_count} {item.active_count === 1 ? 'doc' : 'docs'}
                                        </span>
                                    )}
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${item.compliance_status === 'compliant'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-red-600 text-white'
                                            }`}
                                    >
                                        {item.compliance_status === 'compliant' ? 'Presente' : 'Mancante'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Action Alert */}
                {missingCount > 0 && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900 mb-1">
                                    Azione Richiesta
                                </p>
                                <p className="text-sm text-amber-800">
                                    Per ottenere la certificazione CE è necessario caricare {missingCount === 1 ? 'il documento mancante' : `i ${missingCount} documenti mancanti`}.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {isFullyCompliant && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-green-900 mb-1">
                                    Conformità Completa
                                </p>
                                <p className="text-sm text-green-800">
                                    Tutti i documenti obbligatori per la marcatura CE sono presenti e aggiornati.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}