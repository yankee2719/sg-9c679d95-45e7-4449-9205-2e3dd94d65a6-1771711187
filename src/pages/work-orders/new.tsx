// src/pages/work-orders/new.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { getUserContext } from "@/lib/supabaseHelpers";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WorkOrderNewPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [role, setRole] = useState("technician");

    const type =
        typeof router.query.type === "string"
            ? router.query.type
            : "maintenance";

    useEffect(() => {
        const init = async () => {
            const ctx: any = await getUserContext();
            if (!ctx) {
                router.push("/login");
                return;
            }
            setRole(ctx.role ?? "technician");
        };
        init();
    }, []);

    const handleSave = async () => {
        if (!title.trim()) return;

        const { error } = await supabase.from("work_orders").insert({
            title,
            type,
            status: "open",
            priority: "medium",
        });

        if (!error) router.push("/work-orders");
        else alert(error.message);
    };

    return (
        <MainLayout userRole={role as any}>
            <div className="p-6 space-y-6 max-w-xl">
                <h1 className="text-2xl font-bold">Nuovo Work Order</h1>

                <div className="space-y-2">
                    <Label>Titolo</Label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <Button onClick={handleSave}>Salva</Button>
            </div>
        </MainLayout>
    );
}