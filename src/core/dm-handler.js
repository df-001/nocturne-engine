import { Events } from "discord.js";
import { processText, processTextStream } from "../text/llm-client.js";
import { STREAMING_INTERVAL, MESSAGE_CHAR_LIMIT, DM_SYSTEM_PROMPT } from "../config.js";
import { splitText } from "../text/text-splitter.js";
import { contextStore } from "../text/context.js";


export default (client) => {
    if (STREAMING_INTERVAL > 0) {
        // Streaming enabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            const returnMessage = await message.channel.send("...");

            console.log(`<Message from ${message.author.tag}> ${message.content}`)

            let text = "";
            let lastEditTime = Date.now(); // Date object for timed streams
            const history = await contextStore.get("dm", message.channel.id);

            const stream = processTextStream({ prompt: message.content, sys_prompt: DM_SYSTEM_PROMPT, history });

            for await (const chunk of stream) {
                text += chunk;

                if (Date.now() - lastEditTime >= STREAMING_INTERVAL && text.length < MESSAGE_CHAR_LIMIT) {
                    await returnMessage.edit(text.slice(0, 2000) + " |");
                    lastEditTime = Date.now(); // Reset the timer
                }
            }

            if (text.length > MESSAGE_CHAR_LIMIT) {
                const chunks = splitText(text);
                await returnMessage.edit(chunks[0]);
                for (const chunk of chunks.slice(1)) {
                    await message.channel.send(chunk);
                }
            } else {
                await returnMessage.edit(text);
            }
            // Push to context
            await contextStore.push("dm", message.channel.id, "user",      message.content);
            await contextStore.push("dm", message.channel.id, "assistant", text);

            console.log(`<Response> ${text}`);
        });
    } else {
        // Streaming disabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            await message.channel.sendTyping();

            console.log(`<Message from ${message.author.tag}> ${message.content}`)
            const history = await contextStore.get("dm", message.channel.id);

            const response = await processText({ prompt: message.content, sys_prompt: DM_SYSTEM_PROMPT, history });

            // Push to context
            await contextStore.push("dm", message.channel.id, "user",      message.content);
            await contextStore.push("dm", message.channel.id, "assistant", response);

            console.log(`<Response> ${response}`);
            if (response.length > MESSAGE_CHAR_LIMIT) {
                const chunks = splitText(response);
                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            } else {
                await message.channel.send(response);
            } // For normal messages (default)
            // await message.reply(response) // For Replies
        });
    }
};