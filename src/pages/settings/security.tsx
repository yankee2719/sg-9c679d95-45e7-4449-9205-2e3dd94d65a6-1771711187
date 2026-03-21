import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

export default function SecuritySettingsPage() {
    const { membership } = useAuth();
    const userRole = membership?.role ?? "technician";

    return (
        <MainLayout userRole={userRole}>
            <SEO title="Sicurezza account - MACHINA" />
            <div className="container mx-auto max-w-5xl px-4 py-8">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div>Pagina sicurezza caricata correttamente.</div>
                    <Badge variant="outline">badge test</Badge>
                </div>
            </div>
        </MainLayout>
    );
}