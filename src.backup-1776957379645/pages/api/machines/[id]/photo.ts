import type { NextApiResponse } from "next";
import fs from "fs";
import { withAuth, type AuthenticatedRequest, getServiceSupabase } from "@/lib/apiAuth";
import { getAccessibleMachine, isMachineOwner } from "@/lib/server/machineAccess";

export const config = { api: { bodyParser: false } };

const BUCKET = "equipment-photos";
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

type ParsedForm = {
    files: Record<string, any>;
};

async function parseForm(req: AuthenticatedRequest): Promise<ParsedForm> {
    let formidableLib: any;
    try {
        formidableLib = require("formidable");
    } catch {
        throw new Error('Missing dependency "formidable".');
    }

    return new Promise((resolve, reject) => {
        const form = formidableLib.default ? formidableLib.default({ multiples: false }) : formidableLib({ multiples: false });
        form.parse(req, (err: Error | null, _fields: Record<string, any>, files: Record<string, any>) => {
            if (err) reject(err);
            else resolve({ files });
        });
    });
}

function extractStoragePath(url: string): string | null {
    try {
        const match = url.match(/equipment-photos\/(.+)$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

export default withAuth(["owner", "admin", "supervisor"], async function handler(
    req: AuthenticatedRequest,
    res: NextApiResponse
) {
    const machineId = typeof req.query.id === "string" ? req.query.id : null;
    if (!machineId) return res.status(400).json({ error: "Missing machine id" });

    const supabase = getServiceSupabase();

    try {
        const machine = await getAccessibleMachine < any > (supabase, req.user, machineId, "id, organization_id, photo_url");
        if (!machine) return res.status(404).json({ error: "Machine not found" });
        if (!isMachineOwner(req.user, machine.organization_id)) {
            return res.status(403).json({ error: "Only owner organization can manage machine photo" });
        }

        if (req.method === "DELETE") {
            const oldPath = machine.photo_url ? extractStoragePath(machine.photo_url) : null;
            if (oldPath) {
                await supabase.storage.from(BUCKET).remove([oldPath]);
            }

            const { error: updateError } = await supabase
                .from("machines")
                .update({ photo_url: null, updated_at: new Date().toISOString() } as any)
                .eq("id", machineId);
            if (updateError) return res.status(500).json({ error: updateError.message });

            await supabase.from("audit_logs").insert({
                organization_id: req.user.organizationId,
                actor_user_id: req.user.userId,
                entity_type: "machine",
                entity_id: machineId,
                action: "photo_update",
                machine_id: machineId,
                old_data: { photo_url: machine.photo_url ?? null },
                new_data: { photo_url: null },
            });

            return res.status(200).json({ photo_url: null });
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { files } = await parseForm(req);
        const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!uploadedFile) {
            return res.status(400).json({ error: "File is required" });
        }
        if (!ACCEPTED.has(uploadedFile.mimetype)) {
            return res.status(400).json({ error: "Unsupported file type" });
        }
        if ((uploadedFile.size ?? 0) > MAX_SIZE) {
            return res.status(400).json({ error: "File too large" });
        }

        const ext = String(uploadedFile.originalFilename || uploadedFile.newFilename || "image.jpg").split(".").pop()?.toLowerCase() || "jpg";
        const path = `${machineId}/${Date.now()}.${ext}`;
        const fileBuffer = fs.readFileSync(uploadedFile.filepath);

        const oldPath = machine.photo_url ? extractStoragePath(machine.photo_url) : null;
        if (oldPath) {
            await supabase.storage.from(BUCKET).remove([oldPath]);
        }

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, fileBuffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: uploadedFile.mimetype,
        });
        if (uploadError) return res.status(500).json({ error: uploadError.message });

        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { error: updateError } = await supabase
            .from("machines")
            .update({ photo_url: publicUrl, updated_at: new Date().toISOString() } as any)
            .eq("id", machineId);
        if (updateError) return res.status(500).json({ error: updateError.message });

        await supabase.from("audit_logs").insert({
            organization_id: req.user.organizationId,
            actor_user_id: req.user.userId,
            entity_type: "machine",
            entity_id: machineId,
            action: "photo_update",
            machine_id: machineId,
            old_data: { photo_url: machine.photo_url ?? null },
            new_data: { photo_url: publicUrl },
        });

        try { fs.unlinkSync(uploadedFile.filepath); } catch { }
        return res.status(200).json({ photo_url: publicUrl });
    } catch (error: any) {
        console.error("Machine photo API error:", error);
        return res.status(error?.message === "Access denied" ? 403 : 500).json({ error: error?.message || "Failed to manage machine photo" });
    }
});
