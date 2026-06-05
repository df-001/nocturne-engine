import { MESSAGE_CHAR_LIMIT } from "../config.js";


export function splitText(text, limit = MESSAGE_CHAR_LIMIT) {
    const chunks = [];
    let currentChunk = "";
    let inCode = false;
    let lang = "";

    // Tokenization
    const tokens = text.match(/\s+|\S+/g) || [];

    // Adds markdown codeblock
    const flushCurrent = () => {
        if (!currentChunk) {
            return;
        }
        
        let finalized = currentChunk;
        if (inCode) {
            finalized = `${currentChunk}\n\`\`\``;
        }
        chunks.push(finalized);
        
        // Reset state for the next chunk
        if (inCode) {
            currentChunk = `\`\`\`${lang}\n`;
        } else {
            currentChunk = "";
        }
    };

    // Chunking process
    for (const token of tokens) {
        let remaining = token;

        while (remaining.length > 0) {
            let overhead = 0;
            if (inCode) {
                overhead = 4; // Reserve space for "\n```"
            }
            
            const available = limit - currentChunk.length - overhead;

            // If token fits completely in the remaining space
            if (remaining.length <= available) {
                currentChunk += remaining;
                break;
            }

            // If token doesnt fit, but we have content to flush first
            let prefixLength = 0;
            if (inCode) {
                prefixLength = 4 + lang.length;
            }

            if (currentChunk.length > prefixLength) {
                flushCurrent();
                continue; // Loop again to evaluate the token against the fresh chunk
            }

            // If a single word is larger than the limit of an empty chunk
            // force-slice it to fit the maximum possible size
            const sliceSize = Math.max(1, available);
            currentChunk += remaining.slice(0, sliceSize);
            remaining = remaining.slice(sliceSize);
            flushCurrent();
        }

        // Markdown codeblock tracking
        const backtickCount = (token.match(/```/g) || []).length;
        if (backtickCount % 2 !== 0) {
            inCode = !inCode;
            
            if (inCode) {
                // Parse the language identifier (e.g., ```javascript -> javascript)
                const langMatch = token.match(/```([a-zA-Z0-9_-]+)/);
                if (langMatch) {
                    lang = langMatch[1];
                } else {
                    lang = "";
                }
            } else {
                lang = "";
            }
        }
    }

    let baseLength = 0;
    if (inCode) {
        baseLength = 4 + lang.length;
    }

    if (currentChunk && currentChunk.length > baseLength) {
        if (inCode) {
            chunks.push(`${currentChunk}\n\`\`\``);
        } else {
            chunks.push(currentChunk);
        }
    }

    return chunks;
}