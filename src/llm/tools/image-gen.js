import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { IMG_URL } from "../../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "..", "..", "..", "data", "web", "uploads");

export const imageGen = {
    definition: {
        type: "function",
        function: {
            name: "generate_image",
            description: "Generate an image.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Description of an image in tags, e.g. nature, forest" }
                },
                required: ["prompt"],
                additionalProperties: false
            }
        }
    },

    status: () => "Generating image...",

    async execute(args, context) {
        const { prompt } = args;
        try {
            const response = await fetch(`${IMG_URL}/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt })
            });
            if (!response.ok) {
                const errorText = await response.text();
                return `Failed to generate image: ${response.status} - ${errorText}`;
            }
            // Get data from server
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Ensure the upload folder exists
            await fs.mkdir(UPLOADS_DIR, { recursive: true });
            // Save the generated image
            const filename = `${crypto.randomUUID()}.png`;
            const filePath = join(UPLOADS_DIR, filename);
            await fs.writeFile(filePath, buffer);
            const mediaUrl = `/media/${filename}`;

            // If in discord channel
            if (context.channel && typeof context.channel.send === "function") {
                await context.channel.send({
                    content: `## ${prompt}`,
                    files: [filePath]
                });
                return "Image generated successfully and sent to the Discord channel.";
            }

            // If on web client
            return `Image generated successfully. ![Generated Image](${mediaUrl})`;
        } catch (error) {
            console.warn("Image generation tool error:", error);
            return `Failed to generate image: ${error.message}`;
        }
    }
};