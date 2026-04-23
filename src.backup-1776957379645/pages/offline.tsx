import Head from "next/head";
import Link from "next/link";
import { Database, FileText, RefreshCw, WifiOff, Wrench } from "lucide-react";

export default function OfflinePage() {
    return (
        <>
            <Head>
                <title>MACHINA | Modalità offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <main className="min-h-screen bg-slate-950 text-slate-100">
                <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
                    <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
                            <div className="mb-8 flex items-center gap-3">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
                                    <WifiOff className="h-7 w-7 text-amber-400" />
                                </div>

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                                        Stato connessione
                                    </p>
                                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                        Modalità offline attiva
                                    </h1>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                                    MACHINA non riesce a raggiungere la rete in questo momento.
                                    Le funzioni già disponibili offline possono continuare a essere
                                    utilizzate, mentre le operazioni che richiedono sincronizzazione
                                    o download live verranno riprese quando la connessione tornerà attiva.
                                </p>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => window.location.reload()}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Riprova connessione
                                    </button>

                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/10"
                                    >
                                        Vai alla dashboard
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Manutenzione sul campo
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Le attività già preparate localmente restano consultabili.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Documenti offline
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        I file già salvati offline possono essere aperti anche senza rete.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                                        <Database className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Sincronizzazione
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Le modifiche locali verranno inviate appena la connessione ritorna.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <aside className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
                            <div className="mb-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Indicazioni operative
                                </p>
                                <h2 className="mt-2 text-2xl font-bold text-white">
                                    Cosa puoi fare adesso
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-sm font-semibold text-white">
                                        1. Continua il lavoro locale
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Usa checklist, snapshot e documenti già disponibili sul dispositivo.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-sm font-semibold text-white">
                                        2. Evita operazioni che richiedono rete
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Download nuovi file, aggiornamenti live e sincronizzazioni complete
                                        potrebbero non riuscire finché la rete resta assente.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-sm font-semibold text-white">
                                        3. Riprova appena la rete torna disponibile
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Quando la connessione ritorna, aggiorna la pagina o rientra nella
                                        dashboard per riprendere il flusso normale.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                                <p className="text-sm font-semibold text-orange-300">
                                    Nota
                                </p>
                                <p className="mt-2 text-sm leading-6 text-orange-100/80">
                                    Questa pagina è pensata per restare stabile anche in caso di problemi
                                    ai provider principali dell’app. Per questo è volutamente indipendente
                                    dai layout condivisi.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </>
    );
}
