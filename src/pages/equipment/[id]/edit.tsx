import { useRouter } from "next/router";
import MachineEditorPage from "@/components/Equipment/MachineEditorPage";

export default function EditEquipmentPage() {
    const router = useRouter();
    const machineId = typeof router.query.id === "string" ? router.query.id : null;

    return <MachineEditorPage mode="edit" machineId={machineId} />;
}
