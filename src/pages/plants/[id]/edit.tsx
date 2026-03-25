import { useRouter } from "next/router";
import PlantEditorPage from "@/components/plants/PlantEditorPage";

export default function EditPlantPage() {
    const router = useRouter();
    const { id } = router.query;

    return (
        <PlantEditorPage
            mode="edit"
            plantId={typeof id === "string" ? id : null}
        />
    );
}
