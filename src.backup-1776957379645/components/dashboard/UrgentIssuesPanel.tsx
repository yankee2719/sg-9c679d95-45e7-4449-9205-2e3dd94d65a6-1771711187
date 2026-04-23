import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IssueTone = "high" | "medium" | "info";

export interface UrgentIssue {
    id: string;
    title: string;
    description: string;
    href: string;
    tone: IssueTone;
    ctaLabel?: string;
}

interface UrgentIssuesPanelProps {
    issues: UrgentIssue[];
}

function toneClasses(tone: IssueTone) {
    switch (tone) {
        case "high":
            return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
        case "medium":
            return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
        case "info":
        default:
            return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300";
    }
}

export default function UrgentIssuesPanel({ issues }: UrgentIssuesPanelProps) {
    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Problemi urgenti</CardTitle>
            </CardHeader>
            <CardContent>
                {issues.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">
                                    Nessuna criticità evidente
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    In base ai dati caricati, non risultano problemi urgenti da
                                    gestire subito.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {issues.map((issue) => (
                            <div
                                key={issue.id}
                                className={`rounded-2xl border p-4 ${toneClasses(issue.tone)}`}
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            <div className="font-semibold">{issue.title}</div>
                                        </div>

                                        <div className="mt-1 text-sm opacity-90">
                                            {issue.description}
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        <Link
                                            href={issue.href}
                                            className="inline-flex items-center gap-2 rounded-xl border border-current px-3 py-2 text-sm font-medium transition hover:opacity-85"
                                        >
                                            <span>{issue.ctaLabel || "Apri"}</span>
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}