import { DISCORD_BOT_ENABLED, WEB_API_ENABLED } from "./config.js";

console.log("<BOOT> Nocturne Engine v0.3.2 starting on Node v24");

if (DISCORD_BOT_ENABLED) {
    await import("./discord-bot.js");
}

if (WEB_API_ENABLED) {
    await import("./web-server.js");
}