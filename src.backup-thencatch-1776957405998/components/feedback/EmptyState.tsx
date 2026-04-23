import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    actionLabel?: string;
    actionHref?: string;
    secondaryActionLabel?: string;
    secondaryActionHref?: string;
}

export default function EmptyState({
    title,
    description,
    icon,
    actionLabel,
    actionHref,
    secondaryActionLabel,
    secondaryActionHref,
}: EmptyStateProps) {
    return (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            {icon && <div className="mb-4 flex justify-center text-muted-foreground">{icon}</div>}

            <h3 className="text-lg font-semibold text-foreground">{title}</h3>

            {description && (
                <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                    {description}
                </p>
            )}

            {(actionLabel || secondaryActionLabel) && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {actionLabel && actionHref && (
                        <Button asChild>
                            <Link href={actionHref}>{actionLabel}</Link>
                        </Button>
                    )}

                    {secondaryActionLabel && secondaryActionHref && (
                        <Button variant="outline" asChild>
                            <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}