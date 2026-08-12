import { Events, MessageFlags } from "discord.js";
import { contextStore } from "../llm/context.js";
import { respondNoStream } from "../llm/llm-helpers.js";
import { loadPresets, getPresetById } from "../api/routes/presets.js";

export default (client) => {
    client.on(Events.InteractionCreate, async (interaction) => {
        // Handle autocomplete interactions
        if (interaction.isAutocomplete()) {
            if (interaction.commandName === "model") {
                const focusedValue = interaction.options.getFocused().toLowerCase();
                const presets = loadPresets();
                const choices = [];
                for (const preset of presets) {
                    if (preset.name.toLowerCase().includes(focusedValue)) {
                        choices.push({
                            name: preset.name,
                            value: String(preset.id)
                        });
                    }
                }
                await interaction.respond(choices.slice(0, 25));
            }
            return;
        }

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

        else if (interaction.commandName === "model") {
            try {
                const presetInput = interaction.options.getString("model");
                const platform = interaction.guildId ? "guild" : "dm";
                const preset = getPresetById(presetInput, platform);

                if (!preset) {
                    return await interaction.reply({
                        content: `Model "${presetInput}" not found.`,
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const channelId = interaction.channelId;
                await contextStore.setPreset(platform, channelId, preset.id);

                await interaction.reply({
                    content: `Model set to **${preset.name}**.`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (e) {
                console.warn(e);
                await interaction.reply({
                    content: "An error occurred while setting the model preset.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    });
};