import { Events } from "discord.js";
import { handleDiscordMessage } from "./discord-request-handler.js";

export default (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return; // Ignore self
        if (message.guild) return; // Ignore server messages

        await handleDiscordMessage(client, message, "dm");
    });
};