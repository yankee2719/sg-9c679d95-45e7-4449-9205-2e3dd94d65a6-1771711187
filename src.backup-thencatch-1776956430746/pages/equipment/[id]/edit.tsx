import { useRouter } from "next/router";
import MachineEditorPage from "@/components/Equipment/MachineEditorPage";

export default function EditEquipmentPage() {
    const router = useRouter();
    const { id } = router.query;

    return <MachineEditorPage mode="edit" machineId={typeof id === "string" ? id : null} />;
}
