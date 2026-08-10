import express from "express";
import { promises as fs } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "..", "..", "..", "data", "web", "uploads");

const router = express.Router();

// Serve data
router.get(["/media/:filename", "/uploads/:filename"], async (req, res) => {
    const filename = basename(req.params.filename);
    const filePath = join(UPLOADS_DIR, filename);

    try {
        const fileBuffer = await fs.readFile(filePath);

        // Attempt to cache image with cloudflare for 1 year
        const ext = filename.split(".").pop().toLowerCase();
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(fileBuffer);
    } catch {
        return res.status(404).json({
            success: false,
            error: "Image not found."
        });
    }
});

export default router;
