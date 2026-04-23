import { useRouter } from "next/router";
import { ChecklistTemplateEditor } from "@/components/Checklists/ChecklistTemplateEditor";

export default function ChecklistTemplateDetailPage() {
    const router = useRouter();
    const templateId = typeof router.query.id === "string" ? router.query.id : null;

    return <ChecklistTemplateEditor mode="edit" templateId={templateId} />;
}
