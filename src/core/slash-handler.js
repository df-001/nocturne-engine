import { Events, MessageFlags } from "discord.js";
import { contextStore } from "../llm/context.js";

export default (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        // Ping Command
        if (interaction.commandName === "ping") {
            await interaction.reply({
                content: "Bot is active.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        else if (interaction.commandName === "reset") {
            const channelId = interaction.channelId;
            const type = interaction.guildId ? "guild" : "dm"; // If exists set to guild otherwise dm

            await contextStore.clear(type, channelId);

            await interaction.reply({
                content: "Conversation history cleared.",
                flags: [MessageFlags.Ephemeral]
            });
        }
        
        // TODO
    });
};