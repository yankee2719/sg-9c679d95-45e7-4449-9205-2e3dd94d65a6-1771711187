import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Factory, Plus, Trash2, Edit2, Save, X, Globe, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Manufacturer {
    id: string;
    name: string;
    country: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    is_archived: boolean;
}

export default function ManufacturersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [orgId, setOrgId] = useState < string | null > (null);
    const [items, setItems] = useState < Manufacturer[] > ([]);

    // Form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState < string | null > (null);
    const [form, setForm] = useState({ name: "", country: "", website: "", email: "", phone: "", address: "", notes: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) { router.push("/login"); return; }
                setUserRole(ctx.role);
                setOrgId(ctx.orgId);
                const { data } = await supabase.from("manufacturers").select("*").order("name");
                if (data) setItems(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        load();
    }, [router]);

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const resetForm = () => {
        setForm({ name: "", country: "", website: "", email: "", phone: "", address: "", notes: "" });
        setEditingId(null); setShowForm(false);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                country: form.country.trim() || null,
                website: form.website.trim() || null,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                address: form.address.trim() || null,
                notes: form.notes.trim() || null,
            };
            if (editingId) {
                const { error } = await supabase.from("manufacturers").update(payload).eq("id", editingId);
                if (error) throw error;
                setItems(prev => prev.map(m => m.id === editingId ? { ...m, ...payload } as Manufacturer : m));
                toast({ title: "Aggiornato" });
            } else {
                const { data, error } = await supabase.from("manufacturers")
                    .insert({ ...payload, organization_id: orgId, is_archived: false })
                    .select().single();
                if (error) throw error;
                setItems(prev => [...prev, data]);
                toast({ title: "Costruttore aggiunto" });
            }
            resetForm();
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        } finally { setSaving(false); }
    };

    const handleEdit = (m: Manufacturer) => {
        setEditingId(m.id);
        setForm({
            name: m.name, country: m.country || "", website: m.website || "",
            email: m.email || "", phone: m.phone || "", address: m.address || "", notes: m.notes || "",
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Eliminare "${name}"?`)) return;
        try {
            const { error } = await supabase.from("manufacturers").delete().eq("id", id);
            if (error) throw error;
            setItems(prev => prev.filter(m => m.id !== id));
            toast({ title: "Eliminato" });
        } catch (err: any) {
            toast({ title: "Errore", description: err?.message, variant: "destructive" });
        }
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title="Costruttori - MACHINA" />
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Costruttori</h1>
                        <p className="text-muted-foreground mt-1">Anagrafica costruttori macchine</p>
                    </div>
                    {isAdmin && !showForm && (
                        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white" onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Nuovo Costruttore
                        </Button>
                    )}
                </div>

                {/* Form */}
                {showForm && isAdmin && (
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">{editingId ? "Modifica Costruttore" : "Nuovo Costruttore"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-foreground">Nome *</Label>
                                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="bg-muted border-border text-foreground" placeholder="es. Siemens" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Paese</Label>
                                    <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                                        className="bg-muted border-border text-foreground" placeholder="es. Germania" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Sito Web</Label>
                                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                                        className="bg-muted border-border text-foreground" placeholder="https://..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email</Label>
                                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="bg-muted border-border text-foreground" placeholder="info@..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Telefono</Label>
                                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="bg-muted border-border text-foreground" placeholder="+39..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Indirizzo</Label>
                                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="bg-muted border-border text-foreground" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-green-600 hover:bg-green-700">
                                    <Save className="w-4 h-4 mr-2" />{saving ? "..." : "Salva"}
                                </Button>
                                <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-2" /> Annulla</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* List */}
                <div className="space-y-3">
                    {items.map(m => (
                        <Card key={m.id} className="bg-card border-border">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Factory className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-bold">{m.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                            {m.country && <span>{m.country}</span>}
                                            {m.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{m.website}</span>}
                                            {m.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>}
                                            {m.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}><Edit2 className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.name)} className="text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {items.length === 0 && (
                    <Card className="bg-card border-border p-12 text-center">
                        <Factory className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">Nessun costruttore</h3>
                        <p className="text-muted-foreground">Aggiungi i costruttori delle tue macchine</p>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
