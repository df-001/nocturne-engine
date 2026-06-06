import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

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

export const DISCORD_TOKEN = string("DISCORD_TOKEN");
export const CLIENT_ID = string("CLIENT_ID");
export const STATUS = string("STATUS");
export const ACTIVITY = string("ACTIVITY");
export const BOT_CHANNEL_NAME = string("BOT_CHANNEL_NAME");
export const STREAMING_INTERVAL = number("STREAMING_INTERVAL");
export const MESSAGE_CHAR_LIMIT = number("MESSAGE_CHAR_LIMIT");

// LLM Config

export const LLM_URL = string("LLM_URL");
export const LLM_MODEL = string("LLM_MODEL");
export const LLM_VISION = boolean("LLM_VISION");
export const ENABLE_TOOLS = boolean("ENABLE_TOOLS");
export const MAX_TOOL_TURNS = number("MAX_TOOL_TURNS");

// External Servers

// Firebase Config