import { readFile, writeFile, mkdir, unlink, stat } from "fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

// Resolve absolute path for data/web
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(__dirname, "..", "..", "data", "web");

export async function initializeWebDatabase() {
    try {
        await mkdir(DATA_ROOT, { recursive: true });
        console.log(`Web database ready at: ${DATA_ROOT}`);
    } catch (e){
        console.warn("Failed to initialize web database:", e);
    }
}

async function ensureDirectory(path) {
    try {
        await mkdir(path, { recursive: true });
    } catch (e) {
        console.error(`Failed to ensure directory at ${path}:`, e);
        throw e;
    }
}

async function ensureIndex(indexPath) {
    try {
        await stat(indexPath);
    } catch (e) {
        if (e.code === "ENOENT") {
            const emptyJson = JSON.stringify([]);
            await writeFile(indexPath, emptyJson, "utf8");
        } else {
            throw e;
        }
    }
}

export async function getIndex(uid) {
    await ensureDirectory(join(DATA_ROOT, uid));

    const indexPath = join(DATA_ROOT, uid, "index.json");

    await ensureIndex(indexPath);
    
    const rawData = await readFile(indexPath, "utf8");
    const data = JSON.parse(rawData);

    return data;
}

export async function createConversation(uid, conversationId) {
    const newPath = join(DATA_ROOT, uid, `${conversationId}.json`);
    const emptyJson = JSON.stringify([]);

    await writeFile(newPath, emptyJson, "utf8");
}

export async function touchIndex(uid, metadata) {
    const indexData = await getIndex(uid);
    const indexPath = join(DATA_ROOT, uid, "index.json");

    const existingIndex = indexData.findIndex(data => data.id === metadata.id);

    if (existingIndex === -1) { // If index not found
        indexData.unshift(metadata);

        await writeFile(indexPath, JSON.stringify(indexData, null, 4), "utf8");
    } else {
        const [updMetadata] = indexData.splice(existingIndex, 1); // Remove old metadata
        updMetadata.updatedAt = Date.now(); // Update
        indexData.unshift(updMetadata); // Send back to top

        await writeFile(indexPath, JSON.stringify(indexData, null, 4), "utf8");
    }
}

export async function deleteChat(uid, conversationId) {
    const safeId = basename(conversationId);

    const conversationPath = join(DATA_ROOT, uid, `${safeId}.json`);
    const indexPath = join(DATA_ROOT, uid, "index.json");

    // Delete conversation file
    await unlink(conversationPath);
    // Delete reminants from index
    const indexData = await getIndex(uid);
    const updatedIndex = indexData.filter(data => data.id !== safeId);

    await writeFile(indexPath, JSON.stringify(updatedIndex, null, 4), "utf8");
}