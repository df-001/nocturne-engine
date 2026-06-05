import { Client, Events, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import { DISCORD_TOKEN, CLIENT_ID, STATUS, ACTIVITY } from "./config.js";

import slashListener from "./core/slash-handler.js";
import dmListener from "./core/dm-handler.js";

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, // Server events
        GatewayIntentBits.DirectMessages, // DM events
    ],
    partials: [
        Partials.Channel // DMs from server mutuals
    ]
});
// Create listeners for all event types
slashListener(client);
dmListener(client);

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