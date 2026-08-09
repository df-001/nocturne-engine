import { TAVILY_API_KEYS } from "../../config.js";

export const webSearch = {
    definition: {
        type: "function",
        function: {
            name: "web_search",
            description: "Searches the web for a given query. Use this tool when the user asks about recent events, factual questions or up-to-date information.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query to look up on the web."
                    }
                },
                required: ["query"],
                additionalProperties: false
            }
        }
    },

    status: (args) => `Searching the web for "${args.query}"...`,

    async execute(args) {
        const { query } = args;

        if (!query) return "Search failed: No query provided.";
        if (!TAVILY_API_KEYS?.length) {
            console.warn("WARNING: API Keys not set, search unavailable.");
            return "Search failed: API unavailable.";
        }

        // try each key in order until a request succeeds
        for (const apiKey of TAVILY_API_KEYS) {
            try {
                const res = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: apiKey,
                        query,
                        search_depth: "basic", // "basic" | "advanced" (2x credits) | "fast" | "ultra-fast"
                        include_answer: true,
                        max_results: 5
                    })
                });

                // skip to next key on 429 or quota errors
                if (!res.ok) continue;

                const data = await res.json();
                const output = [];

                // include direct answer text if Tavily generated one
                if (data.answer) {
                    output.push(`**Direct Answer:** ${data.answer}`);
                }

                // format search result items as a markdown list with cleaned snippets
                const results = data.results || [];
                for (let j = 0; j < results.length; j++) {
                    const item = results[j];
                    const title = (item.title || "Untitled").trim();
                    const url = item.url || "#";
                    let snippet = item.content || "No snippet available";
                    if (item.content.length > 300) {
                        snippet = item.content.slice(0, 300) + "...";
                    }

                    output.push(`${j + 1}. [${title}](${url})\n  ${snippet}`);
                }
                console.log(`Output for "${query}":`, output.join("\n\n"));
                return output.join("\n\n") || "No search results found.";
            } catch (e) {
                // try next API key on fetch network errors
                console.warn(e);
                continue;
            }
        }
        console.log("Search failed: API limits reached.");
        return "Search failed: API limits reached.";
    }
};


