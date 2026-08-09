import { GIPHY_API_KEYS } from "../../config.js";

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
        for (const apiKey of GIPHY_API_KEYS) {
            try {
                const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(prompt)}&limit=10`
                const res = await fetch(url);
                if (!res.ok) continue;

                const data = await res.json();
                const gifs = data.data || [];
                if (gifs.length === 0) continue;
                // Pick a random GIF from results
                const randomIndex = Math.floor(Math.random() * gifs.length);
                gifUrl = gifs[randomIndex].images.original.url;
                break;
            } catch (err) {
                console.warn("Giphy fetch error:", err.message);
                continue;
            }
        }

        if (context.channel) {
            console.log("Detected platform: Discord")
            await context.channel.send(gifUrl);
            return `GIF successfully posted to Discord channel.`
        }
        console.log("Detected platform: Web")
        return `GIF found. Include this exact markdown image in your response so it renders for the user: ![${prompt}](${gifUrl})`;
    }
};