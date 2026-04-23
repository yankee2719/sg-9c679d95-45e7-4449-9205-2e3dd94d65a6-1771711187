// src/components/ImpersonationBanner.tsx
/**
 * Impersonation Banner
 * Shows when platform admin is impersonating a tenant
 * Displays session info and allows ending the session
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { platformService } from "@/services/platformService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ImpersonationBanner() {
    const router = useRouter();
    const { toast } = useToast();
    const [impersonation, setImpersonation] = useState<{
active: boolean;
sessionId?: string;
organizationId?: string;
expiresAt?: string;
} | null>(null);

    const [organizationName, setOrganizationName] = useState<string>("");

    useEffect(() => {
        checkImpersonation();
    }, []);

    const checkImpersonation = async () => {
        const impersonationStatus = await platformService.isImpersonating();

        if (impersonationStatus.active) {
            setImpersonation(impersonationStatus);

            // Load organization name
            if (impersonationStatus.organizationId) {
                loadOrganizationName(impersonationStatus.organizationId);
            }
        }
    };

    const loadOrganizationName = async (orgId: string) => {
        try {
            const org = await platformService.getOrganizationById(orgId);
            if (org) {
                setOrganizationName(org.name);
            }
        } catch (error) {
            console.error("Error loading organization:", error);
        }
    };

    const handleEndSession = async () => {
        if (!impersonation?.sessionId) return;

        const { success } = await platformService.endImpersonation(
            impersonation.sessionId
        );

        if (success) {
            toast({
                title: "Session Ended",
                description: "Impersonation session has been terminated.",
            });

            // Redirect to platform dashboard
            setTimeout(() => {
                router.push("/platform/dashboard");
            }, 500);
        } else {
            toast({
                title: "Error",
                description: "Failed to end impersonation session",
                variant: "destructive",
            });
        }
    };

    const formatExpiresAt = (expiresAt?: string) => {
        if (!expiresAt) return "";

        const date = new Date(expiresAt);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins} minutes`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    if (!impersonation?.active) return null;

    return (
        <Alert className="bg-yellow-50 border-yellow-200 rounded-none border-x-0 border-t-0">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-yellow-800 font-medium">
                        🔓 Platform Access Mode
                    </span>
                    <span className="text-yellow-700">
                        Viewing <strong>{organizationName || "organization"}</strong> data
                    </span>
                    <span className="text-yellow-600 text-sm">
                        Expires in {formatExpiresAt(impersonation.expiresAt)}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEndSession}
                    className="ml-4 border-yellow-300 hover:bg-yellow-100"
                >
                    <X className="h-4 w-4 mr-1" />
                    End Session
                </Button>
            </AlertDescription>
        </Alert>
    );
}
