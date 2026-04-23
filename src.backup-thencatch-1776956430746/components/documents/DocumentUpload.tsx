import DocumentManager from "@/components/documents/DocumentManager";

type DocumentUploadProps = {
    machineId?: string;
    equipmentId?: string;
    readOnly?: boolean;
    machineOwnerOrgId?: string | null;
    currentOrgId?: string | null;
    currentOrgType?: "manufacturer" | "customer" | null;
    currentUserRole?: string | null;
};

export function DocumentUpload({
    machineId,
    equipmentId,
    readOnly,
    machineOwnerOrgId,
    currentOrgId,
    currentOrgType,
    currentUserRole,
}: DocumentUploadProps) {
    const resolvedMachineId = machineId ?? equipmentId ?? null;

    if (!resolvedMachineId) return null;

    return (
        <DocumentManager
            machineId={resolvedMachineId}
            readOnly={readOnly}
            machineOwnerOrgId={machineOwnerOrgId ?? null}
            currentOrgId={currentOrgId ?? null}
            currentOrgType={currentOrgType ?? null}
            currentUserRole={currentUserRole ?? null}
        />
    );
}

export default DocumentUpload;

