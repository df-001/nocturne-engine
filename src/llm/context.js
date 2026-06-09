import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORY_LIMIT } from "../config.js";

// Resolve absolute path for data/discord
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, "..", "..", "data", "discord");

class ContextStore {
    #cache = new Map();
    #defaultLimit;

    // Constructor
    constructor(limit = HISTORY_LIMIT) {
        this.#defaultLimit = limit;
    }

    #filePath(type, channelId) {
        // Returns .json path for conversation e.g. data/discord/<type>/<channelId>.json
        const dir = join(DATA_ROOT, type);
        const file = join(dir, `${channelId}.json`);

        return { dir, file };
    }

    async #load(type, channelId) {
        // if the key isnt in the cache yet, try reading and JSON-parsing the file. If it doesnt exist (catch the error), start with []. stores the result in this.#cache.
        if (this.#cache.has(channelId)) {
            return;
        }

        const { file } = this.#filePath(type, channelId);

        try {
            const rawData = await readFile(file, "utf8");

            const parsed = JSON.parse(rawData);

            // Reads JSON into cache map
            this.#cache.set(channelId, parsed.messages || []);
        } catch (error) {
            if (error.code === "ENOENT") {
                // File not exists
                this.#cache.set(channelId, []);
            } else {
                // Corruption
                console.warn(`Failed to read/parse history for channel ${channelId}:`, error.message);
                this.#cache.set(channelId, []);
            }
        }
    }

    async #save(type, channelId) {
        // Get new messages from cache, convert messages to JSON then write to disk
        const { dir, file } = this.#filePath(type, channelId);

        const messages = this.#cache.get(channelId) || [];

        try {
            await mkdir(dir, { recursive: true });

            const content = JSON.stringify({ messages }, null, 4);

            await writeFile(file, content, "utf8");
        } catch (error) {
            console.warn(`Failed to save history for channel ${channelId}:`, error.message);
        }
    }


    async get(type, channelId) {
        // call #load, then return a copy of the array
        await this.#load(type, channelId);

        const messages = this.#cache.get(channelId) || [];

        return [...messages];
    }

    async push(type, channelId, role, content) {
        // Load in current data, add message and trim to max length
        await this.#load(type, channelId);

        const messages = this.#cache.get(channelId);

        messages.push({ role, content });

        while (messages.length > this.#defaultLimit) {
            messages.shift();
        }

        await this.#save(type, channelId);
    }


    async clear(type, channelId) {
        // Clears cache and file
        this.#cache.delete(channelId);

        const { file } = this.#filePath(type, channelId);
        try {
            await unlink(file);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.warn(`Failed to delete history file for channel ${channelId}:`, error.message);
            }
        }
    }
}

// Export singleton instance
export const contextStore = new ContextStore(HISTORY_LIMIT);
