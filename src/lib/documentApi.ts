import {
    documentService,
    downloadVersion,
    getMandatoryDocumentStatus as getMandatoryDocumentStatusCurrent,
    type DocumentCategory,
    type UploadDocumentResult,
} from "@/services/documentService";
import { calculateChecksum } from "./documentUtils";

export interface UploadDocumentParams {
    organizationId: string;
    categoryCode: string;
    file: File;
    title: string;
    description?: string;
    documentCode?: string;
    regulatoryReference?: string;
    languageCode?: string;
    equipmentId?: string | null;
    machineId?: string | null;
    plantId?: string | null;
    createdBy?: string | null;
}

export interface UploadProgress {
    stage: "checksum" | "database" | "storage" | "version" | "complete";
    progress: number;
    message: string;
}

function normalizeCategory(categoryCode: string): DocumentCategory {
    const normalized = String(categoryCode ?? "").trim().toLowerCase();

    const known: DocumentCategory[] = [
        "technical_manual",
        "risk_assessment",
        "ce_declaration",
        "electrical_schema",
        "maintenance_manual",
        "spare_parts_catalog",
        "training_material",
        "inspection_report",
        "certificate",
        "photo",
        "video",
        "other",
    ];

    return known.includes(normalized as DocumentCategory)
        ? (normalized as DocumentCategory)
        : "other";
}

export async function uploadDocument(
    params: UploadDocumentParams,
    onProgress?: (progress: UploadProgress) => void
): Promise<{ documentId: string; versionId: string }> {
    onProgress?.({ stage: "checksum", progress: 10, message: "Calcolo checksum..." });
    await calculateChecksum(params.file);

    onProgress?.({ stage: "database", progress: 25, message: "Preparazione documento..." });

    const result: UploadDocumentResult = await documentService.uploadDocument({
        organizationId: params.organizationId,
        equipmentId: params.equipmentId ?? params.machineId ?? null,
        machineId: params.machineId ?? params.equipmentId ?? null,
        plantId: params.plantId ?? null,
        title: params.title,
        description: params.description ?? null,
        category: normalizeCategory(params.categoryCode),
        file: params.file,
        changeSummary: params.documentCode
            ? `Initial upload (${params.documentCode})`
            : "Initial upload",
        language: params.languageCode ?? "it",
        regulatoryReference: params.regulatoryReference ?? null,
        createdBy: params.createdBy ?? null,
    });

    onProgress?.({ stage: "complete", progress: 100, message: "Upload completato!" });

    return {
        documentId: result.document.id,
        versionId: result.version.id,
    };
}

export async function addDocumentVersion(
    documentId: string,
    file: File,
    changeDescription?: string,
    _isMajorRevision = false,
    onProgress?: (progress: UploadProgress) => void
): Promise<string> {
    onProgress?.({ stage: "checksum", progress: 10, message: "Calcolo checksum..." });
    await calculateChecksum(file);

    onProgress?.({ stage: "version", progress: 40, message: "Creazione nuova versione..." });

    const uploaded = await documentService.uploadNewVersion({
        documentId,
        file,
        changeSummary: changeDescription ?? "Nuova versione",
    });

    onProgress?.({ stage: "complete", progress: 100, message: "Versione aggiunta!" });
    return uploaded.version.id;
}

export async function downloadDocument(
    versionId: string,
    _verifyIntegrity = true
): Promise<Blob> {
    const signedUrl = await downloadVersion(versionId, 600);
    if (!signedUrl) {
        throw new Error("Unable to create signed download URL for document version");
    }

    const response = await fetch(signedUrl);
    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    return response.blob();
}

export async function getMandatoryDocumentStatus(organizationId: string, machineId?: string) {
    return getMandatoryDocumentStatusCurrent(organizationId, machineId);
}

export { documentService };
export default documentService;
