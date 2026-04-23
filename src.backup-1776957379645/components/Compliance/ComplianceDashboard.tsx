import ComplianceStatusCard from "@/components/Compliance/ComplianceStatusCard";

export default function ComplianceDashboard() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ComplianceStatusCard title="Documentazione" value="N/D" description="Sezione compliance temporaneamente semplificata." />
            <ComplianceStatusCard title="Valutazione rischi" value="N/D" description="Da riallineare alla logica finale del modulo compliance." />
            <ComplianceStatusCard title="Checklist" value="N/D" description="Placeholder stabile per evitare componenti vuoti in build." />
            <ComplianceStatusCard title="Audit" value="N/D" description="Ripristino completo previsto dopo i fix strutturali." />
        </div>
    );
}
