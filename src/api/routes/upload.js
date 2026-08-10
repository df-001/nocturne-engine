import express from "express";
import multer from "multer";
import { mkdirSync, promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { processImageToBuffer } from "../../llm/llm-helpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "..", "..", "..", "data", "web", "uploads");

// Ensure upload folder exists
mkdirSync(UPLOADS_DIR, { recursive: true });

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 16 * 1024 * 1024 // 16MB limit,downscales on server 
    }
});

// Upload endpoint
router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No image file provided."
            });
        }

        const processedBuffer = await processImageToBuffer(req.file.buffer);

        // Save processed image to disk
        const filename = `${crypto.randomUUID()}.jpg`;
        const filePath = join(UPLOADS_DIR, filename);
        await fs.writeFile(filePath, processedBuffer);

        // Return media retrieval URL
        return res.status(201).json({
            success: true,
            url: `/media/${filename}`
        });
    } catch (err) {
        console.error("Failed to process upload:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to process image upload."
        });
    }
});

export default router;
