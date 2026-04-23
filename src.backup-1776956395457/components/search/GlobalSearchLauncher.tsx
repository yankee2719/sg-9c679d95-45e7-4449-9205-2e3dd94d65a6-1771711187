import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Building2,
    ClipboardList,
    Factory,
    FileText,
    Loader2,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type SearchItem = {
    id: string;
    label: string;
    subLabel: string;
    href: string;
    type: "machine" | "customer" | "document" | "work_order";
};

type SearchPayload = {
    machines: SearchItem[];
    customers: SearchItem[];
    documents: SearchItem[];
    workOrders: SearchItem[];
};

const copy = {
    it: {
        button: "Cerca in MACHINA...",
        shortcut: "Ctrl/Cmd + K",
        placeholder: "Cerca macchine, clienti, documenti, work orders...",
        hint: "Digita almeno 2 caratteri",
        noResults: "Nessun risultato trovato.",
        machines: "Macchine",
        customers: "Clienti",
        documents: "Documenti",
        workOrders: "Work orders",
        close: "Chiudi",
    },
    en: {
        button: "Search in MACHINA...",
        shortcut: "Ctrl/Cmd + K",
        placeholder: "Search machines, customers, documents, work orders...",
        hint: "Type at least 2 characters",
        noResults: "No results found.",
        machines: "Machines",
        customers: "Customers",
        documents: "Documents",
        workOrders: "Work orders",
        close: "Close",
    },
    fr: {
        button: "Rechercher dans MACHINA...",
        shortcut: "Ctrl/Cmd + K",
        placeholder: "Rechercher machines, clients, documents, work orders...",
        hint: "Saisissez au moins 2 caractères",
        noResults: "Aucun résultat trouvé.",
        machines: "Machines",
        customers: "Clients",
        documents: "Documents",
        workOrders: "Work orders",
        close: "Fermer",
    },
    es: {
        button: "Buscar en MACHINA...",
        shortcut: "Ctrl/Cmd + K",
        placeholder: "Buscar máquinas, clientes, documentos, work orders...",
        hint: "Escribe al menos 2 caracteres",
        noResults: "No se encontraron resultados.",
        machines: "Máquinas",
        customers: "Clientes",
        documents: "Documentos",
        workOrders: "Work orders",
        close: "Cerrar",
    },
} as const;

function sectionIcon(type: SearchItem["type"]) {
    switch (type) {
        case "machine":
            return <Factory className="h-4 w-4" />;
        case "customer":
            return <Building2 className="h-4 w-4" />;
        case "document":
            return <FileText className="h-4 w-4" />;
        case "work_order":
            return <ClipboardList className="h-4 w-4" />;
        default:
            return <Search className="h-4 w-4" />;
    }
}

export default function GlobalSearchLauncher() {
    const { language } = useLanguage();
    const text = copy[language] ?? copy.en;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState < SearchPayload > ({
        machines: [],
        customers: [],
        documents: [],
        workOrders: [],
    });

    const inputRef = useRef < HTMLInputElement | null > (null);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
            if (isShortcut) {
                event.preventDefault();
                setOpen(true);
                return;
            }

            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 60);
        return () => clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        if (query.trim().length < 2) {
            setResults({
                machines: [],
                customers: [],
                documents: [],
                workOrders: [],
            });
            setLoading(false);
            return;
        }

        let active = true;
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const accessToken =
                    (await supabase.auth.getSession()).data.session?.access_token ?? null;

                if (!accessToken) {
                    throw new Error("Sessione non disponibile");
                }

                const response = await fetch(
                    `/api/search/global?q=${encodeURIComponent(query.trim())}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || "Errore ricerca");
                }

                if (!active) return;

                setResults({
                    machines: data.machines ?? [],
                    customers: data.customers ?? [],
                    documents: data.documents ?? [],
                    workOrders: data.workOrders ?? [],
                });
            } catch (error) {
                console.error("Global search error:", error);
                if (!active) return;
                setResults({
                    machines: [],
                    customers: [],
                    documents: [],
                    workOrders: [],
                });
            } finally {
                if (active) setLoading(false);
            }
        }, 250);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [open, query]);

    const sections = useMemo(() => {
        return [
            { key: "machines", title: text.machines, items: results.machines },
            { key: "customers", title: text.customers, items: results.customers },
            { key: "documents", title: text.documents, items: results.documents },
            { key: "workOrders", title: text.workOrders, items: results.workOrders },
        ].filter((section) => section.items.length > 0);
    }, [results, text]);

    const totalResults =
        results.machines.length +
        results.customers.length +
        results.documents.length +
        results.workOrders.length;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-11 min-w-[240px] items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-left text-sm text-muted-foreground shadow-[0_8px_18px_-12px_rgba(15,23,42,0.28)] transition hover:bg-muted"
            >
                <span className="flex items-center gap-3">
                    <Search className="h-4 w-4" />
                    <span>{text.button}</span>
                </span>
                <span className="hidden text-xs lg:inline">{text.shortcut}</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[80]">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute left-1/2 top-[8vh] w-[min(920px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl">
                        <div className="border-b border-border p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                                    <Search className="h-5 w-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <input
                                        ref={inputRef}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={text.placeholder}
                                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    aria-label={text.close}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    Ricerca in corso...
                                </div>
                            ) : query.trim().length < 2 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                                    {text.hint}
                                </div>
                            ) : totalResults === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                                    {text.noResults}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {sections.map((section) => (
                                        <div key={section.key} className="space-y-3">
                                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                                {section.title}
                                            </div>

                                            <div className="grid gap-3">
                                                {section.items.map((item) => (
                                                    <Link
                                                        key={`${item.type}-${item.id}`}
                                                        href={item.href}
                                                        onClick={() => setOpen(false)}
                                                        className="block rounded-2xl border border-border p-4 transition hover:bg-muted/40"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 text-orange-500">
                                                                {sectionIcon(item.type)}
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="truncate font-semibold text-foreground">
                                                                    {item.label}
                                                                </div>
                                                                <div className="mt-1 text-sm text-muted-foreground">
                                                                    {item.subLabel || "—"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}