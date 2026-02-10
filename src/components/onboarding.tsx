// src/pages/onboarding.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { organizationService } from "@/services/organizationService";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Factory, Loader2 } from "lucide-react";

type OrganizationType = "manufacturer" | "company";

interface OnboardingData {
    organizationType: OrganizationType | null;
    organizationName: string;
    industry: string;
    country: string;
    email: string;
    phone: string;
    estimatedMachines?: number;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState < OnboardingData > ({
        organizationType: null,
        organizationName: "",
        industry: "",
        country: "",
        email: "",
        phone: "",
    });

    // Check if user has already completed onboarding
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        const completed = await organizationService.hasCompletedOnboarding();
        if (completed) {
            router.push("/dashboard");
        }
    };

    // Step 1: Choose organization type
    const renderTypeSelection = () => (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Welcome to Machine Passport!</h1>
                <p className="text-muted-foreground">
                    Let's get started by understanding your role
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Manufacturer Option */}
                <Card
                    onClick={() => {
                        setData({ ...data, organizationType: "manufacturer" });
                        setStep(2);
                    }}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary p-6 space-y-4"
                >
                    <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-lg mx-auto">
                        <Factory className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-semibold">I am a Manufacturer</h3>
                        <p className="text-sm text-muted-foreground">
                            I build machines and want to provide digital passports to my
                            customers
                        </p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✓ Create machine digital passports</li>
                        <li>✓ Manage technical documentation</li>
                        <li>✓ Track after-sales support</li>
                        <li>✓ QR code generation</li>
                    </ul>
                </Card>

                {/* Company/Operator Option */}
                <Card
                    onClick={() => {
                        setData({ ...data, organizationType: "company" });
                        setStep(2);
                    }}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary p-6 space-y-4"
                >
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mx-auto">
                        <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-semibold">I Operate Machines</h3>
                        <p className="text-sm text-muted-foreground">
                            I run machines and want to manage their documentation and
                            maintenance
                        </p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✓ Track machine inventory</li>
                        <li>✓ Schedule maintenance</li>
                        <li>✓ Access documentation</li>
                        <li>✓ Monitor machine status</li>
                    </ul>
                </Card>
            </div>
        </div>
    );

    // Step 2: Collect organization details
    const renderOrganizationForm = () => {
        const isManufacturer = data.organizationType === "manufacturer";

        return (
            <form onSubmit={handleCreateOrganization} className="space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">
                        {isManufacturer
                            ? "Tell us about your company"
                            : "Tell us about your operations"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isManufacturer
                            ? "We'll create your manufacturer profile"
                            : "We'll set up your organization"}
                    </p>
                </div>

                <Card className="p-6 space-y-4">
                    {/* Company Name */}
                    <div className="space-y-2">
                        <Label htmlFor="organizationName">
                            Company Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="organizationName"
                            type="text"
                            placeholder="e.g., Acme Manufacturing"
                            required
                            value={data.organizationName}
                            onChange={(e) =>
                                setData({ ...data, organizationName: e.target.value })
                            }
                        />
                    </div>

                    {/* Industry */}
                    <div className="space-y-2">
                        <Label htmlFor="industry">
                            Industry <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={data.industry}
                            onValueChange={(value) => setData({ ...data, industry: value })}
                            required
                        >
                            <SelectTrigger id="industry">
                                <SelectValue placeholder="Select your industry" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="automotive">Automotive</SelectItem>
                                <SelectItem value="food_beverage">
                                    Food & Beverage
                                </SelectItem>
                                <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                                <SelectItem value="manufacturing">
                                    General Manufacturing
                                </SelectItem>
                                <SelectItem value="packaging">Packaging</SelectItem>
                                <SelectItem value="plastics">Plastics & Polymers</SelectItem>
                                <SelectItem value="metalworking">Metalworking</SelectItem>
                                <SelectItem value="electronics">Electronics</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Country */}
                    <div className="space-y-2">
                        <Label htmlFor="country">
                            Country <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="country"
                            type="text"
                            placeholder="e.g., Italy"
                            required
                            value={data.country}
                            onChange={(e) => setData({ ...data, country: e.target.value })}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Company Email (optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="contact@company.com"
                            value={data.email}
                            onChange={(e) => setData({ ...data, email: e.target.value })}
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Company Phone (optional)</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+39 123 456 7890"
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                        />
                    </div>

                    {/* Estimated Machines (only for operators) */}
                    {!isManufacturer && (
                        <div className="space-y-2">
                            <Label htmlFor="estimatedMachines">
                                How many machines do you operate? (estimated)
                            </Label>
                            <Input
                                id="estimatedMachines"
                                type="number"
                                min="1"
                                placeholder="e.g., 50"
                                value={data.estimatedMachines || ""}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        estimatedMachines: parseInt(e.target.value) || undefined,
                                    })
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                This helps us optimize your experience
                            </p>
                        </div>
                    )}
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={loading}
                    >
                        Back
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Organization...
                            </>
                        ) : (
                            "Create Organization"
                        )}
                    </Button>
                </div>
            </form>
        );
    };

    // Handle organization creation
    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.organizationType || !data.organizationName || !data.industry) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            // Generate unique slug
            const slug = await organizationService.generateUniqueSlug(
                data.organizationName
            );

            // Get user email if not provided
            const {
                data: { user },
            } = await supabase.auth.getUser();
            const orgEmail = data.email || user?.email;

            // Create organization
            const { organizationId, error } =
                await organizationService.createOrganizationWithOwner({
                    name: data.organizationName,
                    slug: slug,
                    type: data.organizationType,
                    email: orgEmail,
                    phone: data.phone || undefined,
                });

            if (error) {
                throw error;
            }

            if (!organizationId) {
                throw new Error("Failed to create organization");
            }

            // Complete onboarding
            await organizationService.completeOnboarding(organizationId);

            // Success!
            toast({
                title: "Organization Created!",
                description: `Welcome to ${data.organizationName}`,
            });

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/dashboard");
            }, 1000);
        } catch (error: any) {
            console.error("Error creating organization:", error);

            let errorMessage = "Failed to create organization. Please try again.";

            // Handle specific error cases
            if (error.message?.includes("already belongs")) {
                errorMessage =
                    "You already belong to an organization. Please contact support if you need to create another one.";
            } else if (error.message?.includes("slug")) {
                errorMessage =
                    "An organization with a similar name already exists. Please choose a different name.";
            }

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="w-full max-w-4xl">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-white" : "bg-gray-300"
                                }`}
                        >
                            1
                        </div>
                        <div className="w-16 h-1 bg-gray-300">
                            <div
                                className={`h-full bg-primary transition-all ${step >= 2 ? "w-full" : "w-0"
                                    }`}
                            />
                        </div>
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-white" : "bg-gray-300"
                                }`}
                        >
                            2
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>Choose Type</span>
                        <span>Organization Details</span>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
                    {step === 1 && renderTypeSelection()}
                    {step === 2 && renderOrganizationForm()}
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>
                        By creating an organization, you agree to our{" "}
                        <a href="/terms" className="underline hover:text-primary">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="underline hover:text-primary">
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}