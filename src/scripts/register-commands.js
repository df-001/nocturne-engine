import { REST, Routes } from "discord.js";
import { DISCORD_TOKEN, CLIENT_ID } from "./config.js";

const commands = [
    {
        name: "ping",
        description: "Check bot status.",
    },
    {
        name: "reset",
        description: "Clears all conversation history.",
    },
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
} catch (error) {
    console.error(error);
}