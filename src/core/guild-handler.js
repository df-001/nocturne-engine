import { Events } from "discord.js";
import { handleDiscordMessage } from "./discord-request-handler.js";
import { BOT_CHANNEL_NAME } from "../config.js";

async function isBotReference(message, client) {
    if (message.reference && message.reference.messageId) {
        try {
            const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
            if (referencedMessage.author.id === client.user.id) {
                return true;
            }
        } catch (e) {
            console.warn(e);
        }
        return false;
    }
}

export default (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return; // Ignore self
        if (!message.guild) return; // Ignore dm messages

        if (!message.channel.name.includes(BOT_CHANNEL_NAME)) { // Ignores auto-respond for unrelated channels
            if (!message.mentions.has(client.user.id) && !await isBotReference(message, client)) return; // Ignores non ping in unrelated channels

            const fetched = await message.channel.messages.fetch({ limit: 8 }); // TODO: Add this var to .env
            const recent = Array.from(fetched.values()).reverse(); // Converts to just messages array in chrono order
            recent.pop(); // Deletes users most recent message so it only shows once
            for (const msg of recent) {
                await handleDiscordMessage(client, msg, "guild"); // Automatically processes with debounce into one
            }
        }

        await handleDiscordMessage(client, message, "guild");
    });
};
