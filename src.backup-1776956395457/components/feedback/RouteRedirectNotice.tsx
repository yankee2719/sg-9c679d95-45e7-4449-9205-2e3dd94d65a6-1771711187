import { useEffect } from "react";
import { useRouter } from "next/router";
import { ArrowRight, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

interface RouteRedirectNoticeProps {
    to: string;
    title: string;
    description: string;
    targetLabel?: string;
    withLayout?: boolean;
    userRole?: string;
    seoTitle?: string;
}

function RedirectCard({ title, description, targetLabel }: Pick<RouteRedirectNoticeProps, "title" | "description" | "targetLabel">) {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-10">
            <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>{description}</p>
                    {targetLabel ? (
                        <p className="flex items-center gap-2 text-foreground">
                            <span className="font-medium">{targetLabel}</span>
                            <ArrowRight className="h-4 w-4" />
                        </p>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}

export function RouteRedirectNotice({
    to,
    title,
    description,
    targetLabel,
    withLayout = false,
    userRole,
    seoTitle,
}: RouteRedirectNoticeProps) {
    const router = useRouter();

    useEffect(() => {
        if (!router.isReady) return;
        const id = window.setTimeout(() => {
            router.replace(to);
        }, 80);
        return () => window.clearTimeout(id);
    }, [router, to]);

    const content = <RedirectCard title={title} description={description} targetLabel={targetLabel} />;

    if (!withLayout) {
        return (
            <>
                {seoTitle ? <SEO title={seoTitle} /> : null}
                {content}
            </>
        );
    }

    return (
        <MainLayout userRole={userRole as any}>
            {seoTitle ? <SEO title={seoTitle} /> : null}
            {content}
        </MainLayout>
    );
}

export default RouteRedirectNotice;
