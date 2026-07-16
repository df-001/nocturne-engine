import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadSystemPrompt(name) {
    try {
        console.log(`Reading ${name}`);
        return readFileSync(join("prompts", name), "utf8");
    } catch (err) {
        console.warn(`Failed to load system prompt "${name}":`, err.message);
        return null;
    }
}

function float(key) {
    const value = process.env[key];
    if (value === undefined || value === null || value === "") {
        throw new Error(`Missing environment variable ${key}`);
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${key} must be a valid float, got: "${value}"`);
    }
    return parsed;
}

function number(key) {
    const value = process.env[key];
    if (value === undefined || value === null || value === "") {
        throw new Error(`Missing environment variable ${key}`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${key} must be a valid integer, got: "${value}"`);
    }
    return parsed;
}

function boolean(key) {
    const value = process.env[key];
    if (value === undefined || value === null || value === "") {
        throw new Error(`Missing environment variable ${key}`);
    }
    if (value !== "true" && value !== "false") {
        throw new Error(`Environment variable ${key} must be "true" or "false", got: "${value}"`);
    }
    return value === "true";
}

function string(key) {
    const value = process.env[key];
    if (value === undefined || value === null || value === "") {
        throw new Error(`Missing environment variable ${key}`);
    }
    return value;
}

export const DISCORD_BOT_ENABLED = boolean("DISCORD_BOT_ENABLED");
export const WEB_API_ENABLED = boolean("WEB_API_ENABLED");

// Base Config

export const TEMPERATURE = float("TEMPERATURE");
export const MAX_TOKENS = number("MAX_TOKENS");
export const VOICE = string("VOICE");
export const BREATH_ENABLED = boolean("BREATH_ENABLED");
export const HISTORY_LIMIT = number("HISTORY_LIMIT");

// Prompt Setup

export const DM_SYSTEM_PROMPT = loadSystemPrompt(string("DM_PROMPT"));
export const VOICE_SYSTEM_PROMPT = loadSystemPrompt(string("VOICE_PROMPT"));
export const WEB_SYSTEM_PROMPT = loadSystemPrompt(string("WEB_PROMPT"));

// Discord Config

export const DISCORD_TOKEN = DISCORD_BOT_ENABLED ? string("DISCORD_TOKEN") : null;
export const CLIENT_ID = DISCORD_BOT_ENABLED ? string("CLIENT_ID") : null;
export const STATUS = DISCORD_BOT_ENABLED ? string("STATUS") : null;
export const ACTIVITY = process.env.ACTIVITY || "";
export const BOT_CHANNEL_NAME = process.env.BOT_CHANNEL_NAME || "";
export const STREAMING_INTERVAL = DISCORD_BOT_ENABLED ? number("STREAMING_INTERVAL") : null;
export const MESSAGE_CHAR_LIMIT = DISCORD_BOT_ENABLED ? number("MESSAGE_CHAR_LIMIT") : null;

// LLM Config

export const LLM_URL = string("LLM_URL");
export const LLM_MODEL = string("LLM_MODEL");
export const LLM_VISION = boolean("LLM_VISION");
export const ENABLE_TOOLS = boolean("ENABLE_TOOLS");
export const MAX_TOOL_TURNS = number("MAX_TOOL_TURNS");

// External Servers
export const IMG_URL = process.env.IMG_URL;

// Web Config
export const FIREBASE_PROJECT_ID = WEB_API_ENABLED ? string("FIREBASE_PROJECT_ID") : null;
export const API_PORT = WEB_API_ENABLED ? number("API_PORT") : null;
export const SQLITE_DB_NAME = process.env.SQLITE_DB_NAME || "web.db";
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean); // Removes any empty values from array


