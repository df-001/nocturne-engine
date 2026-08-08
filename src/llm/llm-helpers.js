import { LLM_VISION, STREAMING_INTERVAL, MESSAGE_CHAR_LIMIT, VOICE_SYSTEM_PROMPT, DM_SYSTEM_PROMPT } from "../config.js";
import { contextStore } from "../llm/context.js";
import { splitText } from "../llm/text-splitter.js";
import { processText, processTextStream } from "../llm/llm-client.js";
import sharp from "sharp";

export async function processImageToBuffer(input) {
    let buffer;

    if (typeof input === "string") {
        const response = await fetch(input);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(input)) {
        buffer = input;
    } else {
        throw new Error("Invalid image input type.");
    }

    return await sharp(buffer)
        .rotate()
        .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }) // Maintain aspect after resize
        .jpeg({ quality: 80 })
        .toBuffer();
}

export async function processImageToDataUri(input) {
    const processed = await processImageToBuffer(input);
    return `data:image/jpeg;base64,${processed.toString("base64")}`;
}

export async function buildPrompt(message) {
    // If vision is disabled or no attachments, return plain string

    /* Finds and assigns all images and appends b64 jpeg converted decode to end of prompt json
    Example return:
    "content": [
            { "type": "text", "text": "describe this image" },
            { "type": "image_url", "image_url": { "url": "data:mimetype;base64,actual_encoded_string" } }
        ]
    */
    const imageAttachments = [];

    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith("image/") && LLM_VISION) {
            const dataUri = await processImageToDataUri(attachment.url);
            imageAttachments.push(dataUri);
        }
    }

    if (imageAttachments.length === 0) {
        return message.content || ""; // Returns text only string rather than json if no images present or on non vlm
    }

    const parts = [
        { type: "text", text: message.content || "" }
    ];

    for (const attachment of imageAttachments) {
        parts.push({
            type: "image_url",
            image_url: { url: attachment }
        });
    }

    return parts;
}


export function clearImages(prompt) {
    /*
    Clears any found images from prompt to save token count in history
    */
    if (typeof prompt === "string") return prompt; // Ignores text only strings
    for (const part of prompt) {
        if (part.type === "text") {
            return `${part.text} [sent image]`;
        }
    }
    return "[sent image]"; // Placeholder tag to tell llm that image was present
}

export async function respondStream({ clientContext }) {
    const message = clientContext.message;
    const channel = clientContext.channel;
    const author = clientContext.author;
    const type = clientContext.type;

    let returnMessage = null;

    console.log(`<Message from ${author.username}>`);

    let text = "";
    let lastEditTime = Date.now(); // Date object for timed streams
    const history = await contextStore.get(type, channel.id);

    let prompt = await buildPrompt(message);
    const prefix = `*${author.username}:* `;
    // Adds prefix to users text
    if (typeof prompt === "string") {
        prompt = prefix + prompt;
    } else {
        prompt[0].text = prefix + prompt[0].text;
    }

    let sys_prompt;
    if (type === "guild") {
        sys_prompt = VOICE_SYSTEM_PROMPT;
    } else {
        sys_prompt = DM_SYSTEM_PROMPT;
    }

    const stream = processTextStream({ prompt: prompt, sys_prompt: sys_prompt, history, context: clientContext });

    for await (const chunk of stream) {
        text += chunk;

        if (!returnMessage) {
            returnMessage = await channel.send(text + " |");
            lastEditTime = Date.now();
        }

        if (Date.now() - lastEditTime >= STREAMING_INTERVAL && text.length < MESSAGE_CHAR_LIMIT) {
            await returnMessage.edit(text.slice(0, MESSAGE_CHAR_LIMIT) + "... |");
            lastEditTime = Date.now(); // Reset the timer
        }
    }

    if (text.length > MESSAGE_CHAR_LIMIT) {
        const chunks = splitText(text);
        await returnMessage.edit(chunks[0]);
        for (const chunk of chunks.slice(1)) {
            await channel.send(chunk);
        }
    } else {
        await returnMessage.edit(text);
    }

    // Push to context
    const extractedPrompt = clearImages(prompt);
    await contextStore.push(type, channel.id, "user", extractedPrompt);
    await contextStore.push(type, channel.id, "assistant", text);

    console.log(`<Response> ${text}`);
}

export async function respondNoStream({ clientContext, slashInteraction = false }) {
    const message = clientContext.message;
    const channel = clientContext.channel;
    const author = clientContext.author;
    const type = clientContext.type;

    if (!slashInteraction) await channel.sendTyping();

    console.log(`<Message from ${author.username}>`);
    const history = await contextStore.get(type, channel.id);

    let prompt;
    if (slashInteraction) {
        prompt = message;
    } else {
        prompt = await buildPrompt(message);
        const prefix = `*${author.username}:* `;
        // Adds prefix to users text
        if (typeof prompt === "string") {
            prompt = prefix + prompt;
        } else {
            prompt[0].text = prefix + prompt[0].text;
        }
    }

    let sys_prompt;
    if (type === "guild") {
        sys_prompt = VOICE_SYSTEM_PROMPT;
    } else {
        sys_prompt = DM_SYSTEM_PROMPT;
    }

    const response = await processText({ prompt: prompt, sys_prompt: sys_prompt, history, context: clientContext });

    // Push to context
    const extractedPrompt = clearImages(prompt);
    await contextStore.push(type, channel.id, "user", extractedPrompt);
    await contextStore.push(type, channel.id, "assistant", response);

    console.log(`<Response> ${response}`);
    if (response.length > MESSAGE_CHAR_LIMIT) {
        const chunks = splitText(response);
        let isFirst = true; // Fix for slash commands above max char limit
        for (const chunk of chunks) {
            if (slashInteraction) {
                if (isFirst) {
                    await clientContext.interaction.editReply(chunk);
                    isFirst = false;
                } else {
                    await clientContext.interaction.followUp(chunk);
                }
            } else {
                await channel.send(chunk);
            }
        }
    } else {
        if (slashInteraction) {
            await clientContext.interaction.editReply(response);
        } else {
            await channel.send(response);
        }
    }
}