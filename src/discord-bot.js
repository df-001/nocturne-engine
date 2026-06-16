import { Client, Events, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import { DISCORD_TOKEN, STATUS, ACTIVITY } from "./config.js";

import slashListener from "./core/slash-handler.js";
import dmListener from "./core/dm-handler.js";
import guildListener from "./core/guild-handler.js";

function shutdown() {
    console.log("Ending process...");
    client.destroy();
    process.exit(0);
}

process.on("unhandledRejection", (e) => {
    // Global error handler to prevent unexpected crashes
    console.error("Unhandled rejection:", e);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Server events
        GatewayIntentBits.GuildMessages, // Used for getting MessageCreate events
        GatewayIntentBits.MessageContent, // Read message content (guilds)
        GatewayIntentBits.DirectMessages, // DM events
    ],
    partials: [
        Partials.Channel // DMs from server mutuals
    ]
});
// Expose client globally for web-server
global.discordClient = client;

// Create listeners for all event types
slashListener(client);
dmListener(client);
guildListener(client);

client.on(Events.ClientReady, readyClient => {
    console.log(`Active account: ${readyClient.user.tag}`);

    client.user.setPresence({
        status: STATUS,
        activities: [{
            name: ACTIVITY,
            type: ActivityType.Custom // Playing, Watching, Listening, Streaming, Competing, Custom
        }]
    });
});

client.login(DISCORD_TOKEN);

// End on signal interrupt/termination
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);