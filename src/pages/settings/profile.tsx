import { FormEvent, useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getProfileData } from "@/lib/supabaseHelpers";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsProfilePage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileId, setProfileId] = useState < string | null > (null);
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            const { data } = await supabase.auth.getUser();
            const user = data.user;
            if (!user) {
                setLoading(false);
                return;
            }

            const profile = await getProfileData(user.id);
            setProfileId(user.id);
            setEmail(user.email ?? "");
            setFirstName((profile as any)?.first_name ?? "");
            setLastName((profile as any)?.last_name ?? "");
            setDisplayName((profile as any)?.display_name ?? (profile as any)?.full_name ?? "");
            setLoading(false);
        }
        load();
    }, []);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!profileId) return;
        setSaving(true);

        const updates: Record<string, any> = {
            first_name: firstName || null,
            last_name: lastName || null,
            display_name: displayName || null,
            full_name: displayName || `${firstName} ${lastName}`.trim() || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("profiles").update(updates).eq("id", profileId);
        setSaving(false);

        if (error) {
            toast({ title: "Errore", description: error.message, variant: "destructive" });
            return;
        }

        toast({ title: "Profilo aggiornato", description: "Le modifiche sono state salvate." });
    }

    return (
        <>
            <SEO title="Impostazioni profilo" />
            <MainLayout>
                <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Profilo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Caricamento profilo...</p>
                            ) : (
                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="first_name">Nome</Label>
                                            <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last_name">Cognome</Label>
                                            <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="display_name">Nome visualizzato</Label>
                                        <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" value={email} readOnly disabled />
                                    </div>
                                    <Button type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva profilo"}</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </MainLayout>
        </>
    );
}
