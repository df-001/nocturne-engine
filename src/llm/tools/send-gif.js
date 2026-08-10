import { GIPHY_API_KEYS } from "../../config.js";

let index = 0;

export const sendGif = {
    definition: {
        type: "function",
        function: {
            name: "send_gif",
            description: "Search and send a GIF in the chat.",
            parameters: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Description of the GIF to send." }
                },
                required: ["prompt"],
                additionalProperties: false
            }
        }
    },

    status: (args) => `Finding GIF for ${args.prompt}...`,

    async execute(args, context) {
        const { prompt } = args;

        if (!GIPHY_API_KEYS?.length) {
            console.warn("WARNING: API Keys not set, search unavailable.");
            return "Search failed: API unavailable.";
        }

        let gifUrl = null;
        let attempts = 0;
        const maxAttempts = GIPHY_API_KEYS.length;

        // try each key in round-robin order until a request succeeds or max attempts are reached
        while (attempts < maxAttempts) {
            const apiKey = GIPHY_API_KEYS[index];

            index = (index + 1) % GIPHY_API_KEYS.length;

            try {
                const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(prompt)}&limit=10`;
                const res = await fetch(url);
                if (!res.ok) {
                    attempts++;
                    continue;
                }
                const data = await res.json();
                const gifs = data.data || [];
                if (gifs.length === 0) {
                    attempts++;
                    continue;
                }
                // Pick a random GIF from results
                const randomIndex = Math.floor(Math.random() * gifs.length);
                gifUrl = gifs[randomIndex].images.original.url;

                break;
            } catch (err) {
                console.warn("Giphy fetch error:", err.message);
                attempts++;
                continue;
            }
        }

        if (context.channel) {
            await context.channel.send(gifUrl);
            return "GIF successfully posted to Discord channel.";
        }

        return `GIF found. Include this exact markdown image in your response so it renders for the user: ![${prompt}](${gifUrl})`;
    }
};