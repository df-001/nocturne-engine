import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contextStore } from "../context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const users = JSON.parse(readFileSync(join(__dirname, "users.json"), "utf8"));

function knownUsernames() {
    return Object.keys(users);
}

export const messageUser = {
    definition: {
        type: "function",
        function: {
            name: "message_user",
            description: `Send a direct message to a user. Known usernames: ${knownUsernames().join(", ") || "none"}.`,
            parameters: {
                type: "object",
                properties: {
                    username: { type: "string", description: "The username of the person to message." },
                    content: { type: "string", description: "The message content to send." }
                },
                required: ["username", "content"],
                additionalProperties: false
            }
        }
    },

    status: (args) => `Sending message to ${args.username}...`,

    async execute(args, context) {
        // Attempts to send a message through Discord user IDs, then pulls channel id from msg and pushes to context
        const { username, content } = args;

        const userId = users[username.toLowerCase()];
        if (!userId) {
            return `User "${username}" not found. Known users: ${knownUsernames().join(", ")}`;
        }

        try {
            const user = await context.client.users.fetch(userId);
            const sentMessage = await user.send(content);

            const dmChannelId = sentMessage.channel.id;
            await contextStore.push("dm", dmChannelId, "assistant", content);

            return `Message sent to ${username}: "${content}"`;
        } catch (error) {
            return `Failed to message ${username}: ${error.message}`;
        }
    }
};