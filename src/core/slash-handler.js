import { Events, MessageFlags } from "discord.js";
import { contextStore } from "../llm/context.js";
import { respondNoStream } from "../llm/llm-helpers.js";

export default (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        // Ping Command
        if (interaction.commandName === "ping") {
            try {
                await interaction.reply({
                    content: "Bot is active.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (e) {
                console.warn(e);
                await interaction.reply({
                    content: "An error occurred while processing your message.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

        }

        else if (interaction.commandName === "reset") {
            try {
                const channelId = interaction.channelId;
                const type = interaction.guildId ? "guild" : "dm";

                await contextStore.clear(type, channelId);

                await interaction.reply({
                    content: "Conversation history cleared.",
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (e) {
                console.warn(e);
                await interaction.reply({
                    content: "An error occurred while processing your message.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

        }

        else if (interaction.commandName === "chat") {
            try {
                if (!interaction.guildId) return; // Guild only

                await interaction.deferReply();

                const messageText = `*${interaction.user.username}:* ${interaction.options.getString("message")}`;

                const clientContext = {
                    client: client,
                    channel: interaction.channel,
                    author: interaction.user,
                    message: messageText,
                    type: "guild",
                    interaction: interaction,
                    onToolStatus: async (statusText) => {
                        await interaction.channel.send(`*${statusText}*`);
                    }
                };

                await respondNoStream({ clientContext, slashInteraction: true });
            } catch (e) {
                console.warn(e);
                await interaction.reply({
                    content: "An error occurred while processing your message.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    });
};