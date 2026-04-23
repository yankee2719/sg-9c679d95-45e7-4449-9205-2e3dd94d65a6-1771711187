import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MainLayout } from "@/components/Layout/MainLayout";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserContext } from "@/lib/supabaseHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Factory, Plus, Trash2, Edit2, Save, X, Globe, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { manufacturerApi, type Manufacturer } from "@/lib/manufacturerApi";

export default function ManufacturersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState("technician");
    const [items, setItems] = useState < Manufacturer[] > ([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState < string | null > (null);
    const [form, setForm] = useState({
        name: "",
        country: "",
        website: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await getUserContext();
                if (!ctx) {
                    router.push("/login");
                    return;
                }
                setUserRole(ctx.role);
                const data = await manufacturerApi.list();
                setItems(data);
            } catch (err: any) {
                console.error(err);
                toast({
                    title: t("common.error") || "Errore",
                    description: err?.message || (t("manufacturers.loadError") as string) || "Impossibile caricare i costruttori",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router, t, toast]);

    const isAdmin = userRole === "admin" || userRole === "supervisor";

    const resetForm = () => {
        setForm({ name: "", country: "", website: "", email: "", phone: "", address: "", notes: "" });
        setEditingId(null);
        setShowForm(false);
    };

    const buildPayload = () => ({
        name: form.name.trim(),
        country: form.country.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
    });

    const handleSave = async () => {
        if (!form.name.trim()) return;

        setSaving(true);
        try {
            const payload = buildPayload();
            if (editingId) {
                const updated = await manufacturerApi.update(editingId, payload);
                setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
                toast({ title: t("manufacturers.updated") || "Aggiornato" });
            } else {
                const created = await manufacturerApi.create(payload);
                setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                toast({ title: t("manufacturers.added") || "Costruttore aggiunto" });
            }
            resetForm();
        } catch (err: any) {
            toast({
                title: t("common.error") || "Errore",
                description: err?.message || "Operazione non riuscita",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item: Manufacturer) => {
        setEditingId(item.id);
        setForm({
            name: item.name,
            country: item.country || "",
            website: item.website || "",
            email: item.email || "",
            phone: item.phone || "",
            address: item.address || "",
            notes: item.notes || "",
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t("common.delete")} \"${name}\"?`)) return;

        try {
            await manufacturerApi.remove(id);
            setItems((prev) => prev.filter((item) => item.id !== id));
            toast({ title: t("manufacturers.deleted") || "Eliminato" });
        } catch (err: any) {
            toast({
                title: t("common.error") || "Errore",
                description: err?.message || "Eliminazione non riuscita",
                variant: "destructive",
            });
        }
    };

    if (loading) return null;

    return (
        <MainLayout userRole={userRole as any}>
            <SEO title={`${t("manufacturers.title") || "Costruttori"} - MACHINA`} />
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t("manufacturers.title") || "Costruttori"}</h1>
                        <p className="mt-1 text-muted-foreground">
                            {t("manufacturers.subtitle") || "Anagrafica costruttori macchine"}
                        </p>
                    </div>
                    {isAdmin && !showForm ? (
                        <Button className="bg-[#FF6B35] text-white hover:bg-[#e55a2b]" onClick={() => setShowForm(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t("manufacturers.new") || "Nuovo Costruttore"}
                        </Button>
                    ) : null}
                </div>

                {showForm && isAdmin ? (
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground">
                                {editingId ? t("manufacturers.editTitle") || "Modifica Costruttore" : t("manufacturers.new") || "Nuovo Costruttore"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("manufacturers.nameLabel") || "Nome"} *</Label>
                                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("manufacturers.countryLabel") || "Paese"}</Label>
                                    <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("manufacturers.websiteLabel") || "Sito Web"}</Label>
                                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">Email</Label>
                                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("manufacturers.phoneLabel") || "Telefono"}</Label>
                                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-foreground">{t("manufacturers.addressLabel") || "Indirizzo"}</Label>
                                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border-border bg-muted text-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-foreground">{t("common.notes") || "Note"}</Label>
                                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-border bg-muted text-foreground" />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-green-600 hover:bg-green-700">
                                    <Save className="mr-2 h-4 w-4" />
                                    {saving ? "..." : t("common.save")}
                                </Button>
                                <Button variant="outline" onClick={resetForm}>
                                    <X className="mr-2 h-4 w-4" />
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                <div className="space-y-3">
                    {items.map((item) => (
                        <Card key={item.id} className="border-border bg-card">
                            <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                                        <Factory className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{item.name}</h3>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                            {item.country ? <span>{item.country}</span> : null}
                                            {item.website ? (
                                                <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{item.website}</span>
                                            ) : null}
                                            {item.email ? (
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{item.email}</span>
                                            ) : null}
                                            {item.phone ? (
                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{item.phone}</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                {isAdmin ? (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, item.name)} className="text-red-600 dark:text-red-400">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {items.length === 0 ? (
                    <Card className="border-border bg-card p-12 text-center">
                        <Factory className="mx-auto mb-4 h-16 w-16 text-muted-foreground/60" />
                        <h3 className="mb-2 text-xl font-bold text-foreground">{t("manufacturers.empty") || "Nessun costruttore"}</h3>
                        <p className="text-muted-foreground">{t("manufacturers.emptyDesc") || "Aggiungi i costruttori delle tue macchine"}</p>
                    </Card>
                ) : null}
            </div>
        </MainLayout>
    );
}

