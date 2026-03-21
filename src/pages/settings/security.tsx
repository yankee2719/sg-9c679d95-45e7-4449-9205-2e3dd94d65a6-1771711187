import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

export default function SecuritySettingsPage() {
    const { membership } = useAuth();
    const userRole = membership?.role ?? "technician";

    return (
        <MainLayout userRole={userRole}>
            <SEO title="Sicurezza account - MACHINA" />
            <div className="container mx-auto max-w-5xl px-4 py-8">
                <div className="rounded-2xl border border-border bg-card p-6">
                    Pagina sicurezza caricata correttamente.
                </div>
            </div>
        </MainLayout>
    );
}