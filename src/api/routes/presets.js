import express from "express";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRESETS_PATH = join(__dirname, "..", "..", "presets.json");
const PROMPTS_DIR = join(__dirname, "..", "..", "..", "prompts");

const router = express.Router();

export function loadPresets() {
    try {
        const raw = readFileSync(PRESETS_PATH, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`Error loading presets: ${e}`);
        return [];
    }
}

export function getPresetById(id = 0, platform = "web") {
    const presets = loadPresets();

    // parse and validate preset index
    let index = parseInt(id, 10);
    if (isNaN(index)) {
        index = 0;
    }

    // fallback to 0 if index not available in presets.json
    let preset = presets[index];
    if (!preset) {
        preset = presets[0];
    }

    if (!preset) {
        return null;
    }

    const resolvedPreset = { ...preset };

    if (resolvedPreset.systemPrompt) {
        let fileName = resolvedPreset.systemPrompt;

        // if systemPrompt is a dictionary with platform keys
        if (typeof fileName === "object" && fileName !== null) {
            fileName = fileName[platform] || fileName.web || fileName.guild || fileName.dm;
        }

        // read system prompt file content from disk
        try {
            resolvedPreset.systemPrompt = readFileSync(join(PROMPTS_DIR, fileName), "utf8");
        } catch (e) {
            console.warn(`Failed to read prompt file ${fileName}: ${e}`);
            resolvedPreset.systemPrompt = null;
        }
    }

    return resolvedPreset;
}

router.get("/presets", (req, res) => {
    const presets = loadPresets();
    res.json({
        success: true,
        presets: presets
    });
});

export default router;