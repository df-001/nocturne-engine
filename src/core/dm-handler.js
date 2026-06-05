import { Events } from "discord.js";
import { processText, processTextStream } from "../llm/llm-client.js";
import { buildPrompt, clearImages } from "../llm/llm-helpers.js";
import { STREAMING_INTERVAL, MESSAGE_CHAR_LIMIT, DM_SYSTEM_PROMPT } from "../config.js";
import { splitText } from "../llm/text-splitter.js";
import { contextStore } from "../llm/context.js";


export default (client) => {
    if (STREAMING_INTERVAL > 0) {
        // Streaming enabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            // clientContext for whenever needed
            const clientContext = {
                client: client,
                message: message,
                channel: message.channel,
                author: message.author
            };

            let returnMessage = null;

            console.log(`<Message from ${message.author.tag}> ${message.content}`)

            let text = "";
            let lastEditTime = Date.now(); // Date object for timed streams
            const history = await contextStore.get("dm", message.channel.id);

            const prompt = await buildPrompt(message)

            const stream = processTextStream({ prompt: prompt, sys_prompt: DM_SYSTEM_PROMPT, history, context: clientContext });

            for await (const chunk of stream) {
                text += chunk;

                if (!returnMessage) {
                    returnMessage = await message.channel.send(text + " |");
                    lastEditTime = Date.now();
                }

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
            } else if (returnMessage) {
                await returnMessage.edit(text);
            }
            // Push to context
            const extractedPrompt = clearImages(prompt)
            
            await contextStore.push("dm", message.channel.id, "user", extractedPrompt);
            await contextStore.push("dm", message.channel.id, "assistant", text);

            console.log(`<Response> ${text}`);
        });
    } else {
        // Streaming disabled
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return; // Ignore self
            if (message.guild) return; // Ignore server messages

            // clientContext for whenever needed
            const clientContext = {
                client: client,
                message: message,
                channel: message.channel,
                author: message.author
            };

            await message.channel.sendTyping();

            console.log(`<Message from ${message.author.tag}> ${message.content}`)
            const history = await contextStore.get("dm", message.channel.id);

            const prompt = await buildPrompt(message);

            const response = await processText({ prompt: prompt, sys_prompt: DM_SYSTEM_PROMPT, history, context: clientContext });

            // Push to context
            const extractedPrompt = clearImages(prompt)
            await contextStore.push("dm", message.channel.id, "user", extractedPrompt);
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