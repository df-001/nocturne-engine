import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { processText } from "../llm/llm-client.js";
import { SQLITE_DB_NAME } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, "..", "..", "data", "web");
mkdirSync(DATA_ROOT, { recursive: true });
const db = new DatabaseSync(join(DATA_ROOT, SQLITE_DB_NAME));


function initializeWebDatabase() {
    // Config
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec("PRAGMA busy_timeout = 5000;");
    // Optimizations
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA cache_size = -64000;"); // 64mb cache
    db.exec("PRAGMA mmap_size = 268435456;"); // 256mb memory map

    // Tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            uid TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT 'New Chat',
            updated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );
    `);
    // TODO CURRENTLY NOT IMPLEMENTED
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            image_type TEXT NOT NULL DEFAULT 'input',
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        );
    `);

    // Indexes
    db.exec("CREATE INDEX IF NOT EXISTS idx_conversations_uid ON conversations(uid);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_message_images_message_id ON message_images(message_id);"); // ALSO TODO
}

initializeWebDatabase();

// Get conversation list
export function getIndex(uid) {
    const stmt = db.prepare(`
        SELECT id, title, updated_at as updatedAt, created_at as createdAt
        FROM conversations
        WHERE uid = ?
        ORDER BY updatedAt DESC
    `);

    return stmt.all(uid);
}

// Get single conversation with assets
export function getConversation(uid, conversationId) {
    const exists = db.prepare("SELECT 1 FROM conversations WHERE uid = ? AND id = ?").get(uid, conversationId);
    if (!exists) {
        return null;
    };

    const stmt = db.prepare(`
        SELECT id, role, content, created_at as createdAt
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
    `);
    // image shit not finished yet
    return stmt.all(conversationId);
}

// Create a new listed conversation
export function createConversation(uid, conversationId, title = "New Chat") {
    const now = Date.now();
    const stmt = db.prepare(`
        INSERT INTO conversations (id, uid, title, created_at, updated_at)
        VALUES (?,?,?,?,?)
    `);

    stmt.run(conversationId, uid, title, now, now);

    return {
        id: conversationId,
        title,
        updatedAt: now,
        createdAt: now
    };
}

// Add a chat message to an existing conversation
export function appendChatMessage(conversationId, role, content) {
    const now = Date.now();
    const insertStmt = db.prepare(`
        INSERT INTO messages (conversation_id, role, content, created_at)
        VALUES (?,?,?,?)
    `);
    const updateStmt = db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?");

    // Transaction ensures both operations are linked so database doesnt end up out of sync
    db.exec("BEGIN TRANSACTION;");
    try {
        insertStmt.run(conversationId, role, content, now);
        updateStmt.run(now, conversationId);
        db.exec("COMMIT;");
    } catch (err) {
        db.exec("ROLLBACK;");
        throw err;
    }

    return true;
}

// Delete a conversation
export function deleteChat(uid, conversationId) {
    const stmt = db.prepare("DELETE FROM conversations WHERE id = ? AND uid = ?");
    const result = stmt.run(conversationId, uid);

    return result.changes > 0; // Returns 1 for success and 0 for failure
}

// Summarize for conversation title
export async function summarizeConversation(uid, conversationId) {
    const firstMsg = db.prepare(`
        SELECT content FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
        LIMIT 1
    `).get(conversationId);

    if (!firstMsg || !firstMsg.content) return; // Catch firstMsg null

    try {
        const rawTitle = await processText({
            prompt: `Summarize this user request into a short 1-5 word title. Respond with ONLY the title, no quotation marks, no punctuation, and no extra text:\n\n"${firstMsg.content}"`,
            history: []
        });

        // Remove quotes and enforce a 64 character limit
        const title = rawTitle.replace(/^["']|["']$/g, "").trim().slice(0, 64);

        const stmt = db.prepare(`
            UPDATE conversations
            SET title = ?
            WHERE id = ? AND uid = ?
        `);

        stmt.run(title, conversationId, uid);
    } catch (err) {
        console.warn(`Failed to summarize conversation ${conversationId}:`, err);
    }
}