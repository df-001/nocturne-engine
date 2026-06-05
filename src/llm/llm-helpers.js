import { LLM_VISION } from "../config.js";
import sharp from "sharp";

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
    const supportedTypes = []

    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith("image/") && LLM_VISION) {
            const response = await fetch(attachment.url);
            const buffer = await response.arrayBuffer();
            const jpeg = await sharp(Buffer.from(buffer)).jpeg().toBuffer();
            const base64 = jpeg.toString("base64");

            imageAttachments.push(`data:image/jpeg;base64,${base64}`);
        }
    }

    if (imageAttachments.length === 0) {
        return message.content || ""; // Returns text only string rather than json if no images present or on non vlm
    }

    const parts = [];

    if (message.content) {
        parts.push({ type: "text", text: message.content });
    }

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
        if (part.type === "text") return part.text;
    }
    return "[sent image]"; // Placeholder tag to tell llm that image was present
}