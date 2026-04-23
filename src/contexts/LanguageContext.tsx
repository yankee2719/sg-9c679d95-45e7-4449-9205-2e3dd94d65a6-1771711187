// src/components/dashboard/DashboardCharts.tsx
import { useMemo } from "react";
import type { ReactNode } from "react";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardKpis {
    machineCount: number;
    customerCount: number;
    activeAssignments: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    activeChecklists: number;
    activeDocuments: number;
}

interface DashboardChartsProps {
    kpis: DashboardKpis;
    orgType: "manufacturer" | "customer" | "enterprise" | "enterprise" | null;
    text: {
        machineCount: string;
        customerCount: string;
        activeAssignments: string;
        openWorkOrders: string;
        overdueWorkOrders: string;
        activeChecklists: string;
        activeDocuments: string;
        chartOverview?: string;
        chartDistribution?: string;
    };
}

interface TooltipPayloadRow {
    name?: string;
    value?: number | string;
    color?: string;
    payload?: {
        name?: string;
        value?: number | string;
    };
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadRow[];
    label?: string | number;
}

const COLORS = [
    "hsl(262, 83%, 58%)",
    "hsl(217, 91%, 60%)",
    "hsl(152, 69%, 44%)",
    "hsl(24, 95%, 53%)",
    "hsl(346, 77%, 50%)",
    "hsl(45, 93%, 47%)",
    "hsl(215, 14%, 50%)",
];

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const resolvedTitle =
        String(label ?? "").trim() ||
        String(payload[0]?.payload?.name ?? payload[0]?.name ?? "").trim() ||
        "Dettaglio";

    return (
        <div
            className="min-w-[180px] rounded-xl border border-border bg-background px-3 py-2 shadow-xl"
            style={{
                color: "hsl(var(--foreground))",
                boxShadow:
                    "0 10px 30px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.10)",
            }}
        >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {resolvedTitle}
            </div>

            <div className="space-y-1.5">
                {payload.map((entry, index) => {
                    const rowLabel =
                        String(entry.name ?? entry.payload?.name ?? "Valore").trim() || "Valore";

                    return (
                        <div
                            key={`${rowLabel}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: entry.color || "hsl(var(--primary))" }}
                                />
                                <span className="truncate text-foreground">{rowLabel}</span>
                            </div>
                            <span className="shrink-0 font-semibold text-foreground">
                                {entry.value ?? "—"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function renderPieLabel({
    name,
    percent,
}: {
    name?: string;
    percent?: number;
}): ReactNode {
    const safeName = String(name ?? "").trim();
    const safePercent = typeof percent === "number" ? `${(percent * 100).toFixed(0)}%` : "";

    if (!safeName) return safePercent;
    if (!safePercent) return safeName;

    return `${safeName} ${safePercent}`;
}

export default function DashboardCharts({
    kpis,
    orgType,
    text,
}: DashboardChartsProps) {
    const barData = useMemo(() => {
        const items = [
            { name: text.machineCount, value: kpis.machineCount, fill: COLORS[0] },
            { name: text.openWorkOrders, value: kpis.openWorkOrders, fill: COLORS[2] },
            { name: text.overdueWorkOrders, value: kpis.overdueWorkOrders, fill: COLORS[5] },
            { name: text.activeChecklists, value: kpis.activeChecklists, fill: COLORS[1] },
            { name: text.activeDocuments, value: kpis.activeDocuments, fill: COLORS[4] },
        ];

        if (orgType === "manufacturer") {
            items.splice(1, 0, {
                name: text.customerCount,
                value: kpis.customerCount,
                fill: COLORS[1],
            });
        }

        return items;
    }, [kpis, orgType, text]);

    const pieData = useMemo(() => {
        const items = [
            { name: text.openWorkOrders, value: kpis.openWorkOrders },
            { name: text.overdueWorkOrders, value: kpis.overdueWorkOrders },
            { name: text.activeChecklists, value: kpis.activeChecklists },
            { name: text.activeAssignments, value: kpis.activeAssignments },
        ].filter((d) => d.value > 0);

        if (items.length === 0) {
            return [{ name: "—", value: 1 }];
        }

        return items;
    }, [kpis, text]);

    const hasData = Object.values(kpis).some((v) => v > 0);

    if (!hasData) return null;

    return (
        <div className="grid gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {text.chartOverview || "Overview"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={barData}
                            margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-20}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: "hsl(var(--muted) / 0.22)" }}
                                content={<CustomChartTooltip />}
                            />
                            <Bar
                                dataKey="value"
                                radius={[8, 8, 0, 0]}
                                maxBarSize={48}
                            >
                                {barData.map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {text.chartDistribution || "Distribuzione operativa"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                                label={renderPieLabel}
                                labelLine={false}
                            >
                                {pieData.map((_, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomChartTooltip />} />
                            <Legend
                                wrapperStyle={{
                                    fontSize: 12,
                                    color: "hsl(var(--foreground))",
                                    paddingTop: 8,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

