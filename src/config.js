import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

function loadSystemPrompt(name) {
    try {
        console.log(`Reading ${name}`)
        return readFileSync(join("prompts", name), "utf8");
    } catch (err) {
        console.warn(`Failed to load system prompt "${name}":`, err.message);
        return null;
    }
}

// Base Config

export const TEMPERATURE = process.env.TEMPERATURE;
export const MAX_TOKENS = process.env.MAX_TOKENS;
export const VOICE = process.env.VOICE;
export const BREATH_ENABLED = process.env.BREATH_ENABLED;
export const HISTORY_LIMIT = process.env.HISTORY_LIMIT;

// Prompt Setup

export const DM_SYSTEM_PROMPT = loadSystemPrompt(process.env.DM_PROMPT);
export const VOICE_SYSTEM_PROMPT = loadSystemPrompt(process.env.VOICE_PROMPT);
export const WEB_SYSTEM_PROMPT = loadSystemPrompt(process.env.WEB_PROMPT);

// Discord Config

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const CLIENT_ID = process.env.CLIENT_ID;
export const STREAMING_INTERVAL = process.env.STREAMING_INTERVAL;
export const MESSAGE_CHAR_LIMIT = process.env.MESSAGE_CHAR_LIMIT;

// LLM Config

export const LLM_URL = process.env.LLM_URL;
export const LLM_MODEL = process.env.LLM_MODEL;
export const LLM_VISION = process.env.LLM_VISION;

// External Servers

// Firebase Config