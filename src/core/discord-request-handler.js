import { STREAMING_INTERVAL, DISCORD_DEBOUNCE_MS } from "../config.js";
import { respondStream, respondNoStream } from "../llm/llm-helpers.js";

// Active session per channel: channelId -> session
const sessions = new Map();

/* 
    Discord clientContext -> client, message, channel, author
*/

async function processSession(client, session, generationId) {
    // if request outdated or queue empty cancel req
    if (session.generationId !== generationId || session.messages.length === 0) {
        return;
    }

    const abortController = new AbortController();
    session.abortController = abortController;
    session.isProcessing = true;

    // make vars for messages
    const currentMessages = [...session.messages];
    const latestMessage = currentMessages[currentMessages.length - 1];

    // combine all messages into a unified message object with the speaker tags
    const textLines = [];
    const mergedAttachments = new Map();

    for (const msg of currentMessages) {
        const username = msg.author?.username || "User";
        const content = msg.content || "";
        textLines.push(`<speaker name="${username}">${content}</speaker>`);

        if (msg.attachments) {
            for (const [key, value] of msg.attachments) {
                mergedAttachments.set(key, value);
            }
        }
    }

    const combinedMessage = {
        ...latestMessage,
        author: latestMessage.author,
        channel: latestMessage.channel,
        content: textLines.join("\n"),
        attachments: mergedAttachments
    };

    const clientContext = {
        client: client,
        message: combinedMessage,
        channel: latestMessage.channel,
        author: latestMessage.author,
        type: session.type,
        signal: abortController.signal,
        isCancelled: () => session.generationId !== generationId || abortController.signal.aborted,
        onToolStatus: async (statusText) => {
            if (session.generationId === generationId && !abortController.signal.aborted) {
                await latestMessage.channel.send(`*${statusText}*`);
            }
        }
    };

    try {
        if (STREAMING_INTERVAL > 0) {
            await respondStream({ clientContext });
        } else {
            await respondNoStream({ clientContext });
        }

        // if completed without being cancelled by a new incoming message
        if (session.generationId === generationId && !abortController.signal.aborted) {
            session.messages = [];
            sessions.delete(session.channelId);
        }
    } catch (err) {
        if (err.name !== "AbortError" && !abortController.signal.aborted) {
            console.error(`Error in discord-request-handler for channel ${session.channelId}:`, err);
        }
        if (session.generationId === generationId) {
            session.messages = [];
            sessions.delete(session.channelId);
        }
    } finally {
        if (session.abortController === abortController) {
            session.abortController = null;
        }
        session.isProcessing = false;
    }
}

export async function handleDiscordMessage(client, message, type) {
    const channelId = message.channel.id;

    let session = sessions.get(channelId);
    if (!session) {
        session = {
            channelId: channelId,
            type: type,
            messages: [],
            generationId: 0,
            debounceTimer: null,
            isProcessing: false,
            abortController: null
        };
        sessions.set(channelId, session);
    }

    // append incoming message
    session.messages.push(message);

    // cancel ongoing generation by incrementing generationId and aborting thge active fetch
    session.generationId++;
    if (session.abortController) {
        session.abortController.abort();
        session.abortController = null;
    }
    const currentGenId = session.generationId;

    if (session.debounceTimer) {
        clearTimeout(session.debounceTimer);
    }

    const debounceMs = DISCORD_DEBOUNCE_MS || 500;

    session.debounceTimer = setTimeout(() => {
        session.debounceTimer = null;
        processSession(client, session, currentGenId);
    }, debounceMs);
}

