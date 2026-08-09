import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { contextStore } from "../context.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const users = JSON.parse(readFileSync(join(__dirname, "users.json"), "utf8"));

function knownUsernames() {
    return Object.keys(users);
}

// very basic implementation, fix up with regex later
function parseDuration(str) {
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

    const unit = str.slice(-1);
    const value = str.slice(0, -1);

    if (!unit) return "No unit supplied"
    return value * multipliers[unit]
};

export const createReminder = {
    definition: {
        type: "function",
        function: {
            name: "create_reminder",
            description: `Schedule a reminder to be sent via Direct Message (DM) to a user after a delay. Known usernames: ${knownUsernames().join(", ") || "none"}.`,
            parameters: {
                type: "object",
                properties: {
                    time: {
                        type: "string",
                        description: "Duration delay before triggering reminder (e.g., '30s', '10m', '2h', '1d')."
                    },
                    reminder: {
                        type: "string",
                        description: "The reminder text or notification content."
                    },
                    username: {
                        type: "string",
                        description: "Optional username to send the reminder to. If left out, sends to the caller."
                    }
                },
                required: ["time", "reminder"],
                additionalProperties: false
            }
        }
    },

    status: (args) => `Scheduling reminder in ${args.time}...`,

    async execute(args, context) {
        const { time, reminder, username } = args;

        const delayMs = parseDuration(time);
        if (!delayMs) {
            return `Invalid time format "${time}". Please use formats like "30s", "10m", "2h", or "1d".`;
        }

        let userId = null;
        let targetName = username; // Used in debug for console + send to LLM

        if (username) {
            userId = users[username.toLowerCase()];
            if (!userId) {
                return `User "${username}" not found. Known users: ${knownUsernames().join(", ")}`;
            }
        } else if (context.author?.id) {
            // Handles no username specified
            userId = context.author.id;
            targetName = context.author.username || "you";
        } else {
            // No username specified + on web
            return "Failed to set reminder: Reminders to caller are not available through web, user must specify reminders to known usernames.";
        }

        const client = context.client || global.discordClient;
        if (!client) {
            // If discord client disabled
            return `Failed to set reminder: Discord client is not available in this environment.`;
        }

        // Schedule reminder dispatch
        setTimeout(async () => {
            try {
                const user = await client.users.fetch(userId);
                const sentMessage = await user.send(reminder);

                const dmChannelId = sentMessage.channel.id;
                await contextStore.push("dm", dmChannelId, "assistant", reminder);
            } catch (e) {
                console.warn(`Failed to dispatch reminder to ${targetName} (${userId}):`, e.message);
            }
        }, delayMs);

        return `Reminder successfully set for ${targetName} in ${time}: "${reminder}".`;
    }
};
