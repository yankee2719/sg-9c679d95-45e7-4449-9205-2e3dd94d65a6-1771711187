// src/components/app/ProtectedPage.tsx
import MainLayout from "@/components/Layout/MainLayout";
import OrgContextGuard from "@/components/Auth/OrgContextGuard";
import { SEO } from "@/components/SEO";

interface ProtectedPageProps {
    title: string;
    userRole?: string;
    children: React.ReactNode;
}

export default function ProtectedPage({
    title,
    userRole = "technician",
    children,
}: ProtectedPageProps) {
    return (
        <OrgContextGuard>
            <MainLayout userRole={userRole}>
                <SEO title={title} />
                {children}
            </MainLayout>
        </OrgContextGuard>
    );
}
