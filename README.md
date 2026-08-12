> [!IMPORTANT]
> Nocturne Engine is rewrite of a past project in early stages. It is currently in active development and may contain breaking changes or bugs. Everything is subject to change.

# <img src="https://nocturne.darkfast.uk/favicon.ico" width="24" height="24" alt="Nocturne logo"> Nocturne Engine

A modular, Discord bot and web engine built on Node.js.

---

[Website](https://nocturne.darkfast.uk) · [Github](https://github.com/df-001/nocturne-engine) · [Issues](https://github.com/df-001/nocturne-engine/issues)

## Features

- **Discord Bot Framework**: Supports direct messaging, guild chat integration, designated bot channels, custom bot status, streaming text responses using Discord.js, and per-channel model preset selection (`/model`).
- **LLM & Vision Support**: Uses OpenAI compatible endpoints with image multimodality.
- **Model Presets & Selection**: Dynamic presets for custom system prompts (with platform-specific prompts for web, guild, and DMs), temperature, max tokens, target model, and tool toggles per request or channel.
- **Modular Tooling System**: Easy to create and use tool integrations. 
- **REST & SSE Web API**: Express 5 server featuring Server-Sent Events (SSE) chat streaming, model preset querying (`GET /api/presets`), rate limiting, security headers (Helmet), and title summarization.

## Discord Slash Commands

| Command | Description |
| --- | --- |
| `/chat <message>` | Send a prompt to the bot in a guild channel |
| `/model <model>` | Switch model preset for the current channel (with autocomplete) |
| `/reset` | Clear conversation history for the current channel |
| `/ping` | Check bot status |

## Included Tools
  - **Code Sandbox**: Secure JavaScript code execution powered by `isolated-vm`.
  - **Search Integrations**: Internet search with Tavily and GIF queries via Giphy.
  - **Image Generation**: Local and remote AI image generation integration.
  - **Direct Messaging**: Direct messaging with context injection.
  - **Utility Tools**: Real-time clock and reminders.

## Project Stack

| Layer | Dependency |
| --- | --- |
| **Runtime** | Node.js (`>=24.0.0`) |
| **Web API Framework** | Express 5 |
| **Discord Integration** | Discord.js (v14) |
| **LLM Backend** | OpenAI Endpoints |
| **Execution Sandbox** | `isolated-vm` |
| **Database & Auth** | SQLite & Firebase Admin |
| **Lint** | ESLint |
| **Utilities** | Sharp, Helmet, CORS, Multer |

---

## Prerequisites

> [!WARNING]
> `isolated-vm` compiles C++ binaries during `npm install`. Windows users require Python 3.x and Visual Studio C++ Build Tools.


- **Node.js**: Version `24.0.0` or higher
- **npm**: Package manager (included with Node.js)
- **LLM Provider**: An OpenAI-compatible API server (e.g., [llama.cpp](https://github.com/ggml-org/llama.cpp))
- **Discord Bot Credentials**: A registered Bot Token and Client ID from the [Discord Developer Portal](https://discord.com/developers/applications) *(Required for `DISCORD_BOT_ENABLED=true`)*
- (Optional) **API Keys**:
  - [Tavily API Key](https://tavily.com/) for internet web search tool
  - [Giphy API Key](https://developers.giphy.com/) for GIF search tool
  - [Firebase](https://firebase.google.com/) project credentials for web authentication *(Required for `WEB_API_ENABLED=true`)*

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/df-001/nocturne-engine.git
   cd nocturne-engine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:

   Copy `.env.example` to `.env` and fill in your configuration to spec.

4. **Register Discord commands**:
   ```bash
   npm run register:commands
   ```

5. **Start the engine**:
   ```bash
   npm run start
   ```

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `start` | `node src/index.js` | Starts Nocturne Engine (Bot & Web API) |
| `register:commands` | `node src/scripts/register-commands.js` | Registers slash commands with Discord API |
| `lint` | `eslint src/` | Runs ESLint code quality checks |

---

## License

This project is licensed under the **ISC License**. Refer to `package.json` for details.