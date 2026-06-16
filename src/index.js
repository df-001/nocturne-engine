import { DISCORD_BOT_ENABLED, WEB_API_ENABLED } from "./config.js";

if (DISCORD_BOT_ENABLED) {
    await import("./discord-bot.js");
}

if (WEB_API_ENABLED) {
    await import("./web-server.js");
}