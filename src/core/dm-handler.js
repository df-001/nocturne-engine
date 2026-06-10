import { Events } from "discord.js";
import { respondStream, respondNoStream } from "../llm/llm-helpers.js";
import { STREAMING_INTERVAL } from "../config.js";

export default (client) => {
    if (STREAMING_INTERVAL > 0) {
        // Streaming enabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            // clientContext for response
            const clientContext = {
                client: client,
                message: message,
                channel: message.channel,
                author: message.author,
                type: "dm",
                onToolStatus: async (statusText) => {
                    await message.channel.send(`*${statusText}*`);
                }
            };

            await respondStream({ clientContext });
        });
    } else {
        // Streaming disabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            // clientContext for response
            const clientContext = {
                client: client,
                message: message,
                channel: message.channel,
                author: message.author,
                type: "dm",
                onToolStatus: async (statusText) => {
                    await message.channel.send(`*${statusText}*`);
                }
            };

            await respondNoStream({ clientContext });
        });
    }
};