import { ENABLE_TOOLS } from "../../config.js";
import { getCurrentTime } from "./get-current-time.js";
import { messageUser } from "./message-user.js";
import { imageGen } from "./image-gen.js";
import { runCode } from "./code-sandbox.js";
import { webSearch } from "./web-search.js";

const tools = [getCurrentTime, messageUser, imageGen, runCode, webSearch];

/* 
    ARGS:
    Property values for LLM, e.g. timezone: "utc",
    CONTEXT:
    Discord clientContext -> client, message, channel, author
*/

export function getToolDefinitions() {
    // Gets definitions from each tool and returns a list containing them
    if (!ENABLE_TOOLS) return [];

    const definitions = [];
    for (const tool of tools) {
        definitions.push(tool.definition);
    }
    return definitions;
}

export function getToolStatus(name, args) {
    // Gets status and builds string with args
    let matchedTool = null;

    for (const tool of tools) {
        if (tool.definition.function.name === name) {
            matchedTool = tool;
            break;
        }
    }

    if (matchedTool && matchedTool.status) {
        return matchedTool.status(args);
    }
    // Fallback
    return `Running tool ${name}...`;
}


export async function useTool(name, args, context) {
    // Finds and executes tool code
    let activeTool = null;
    for (const tool of tools) {
        if (tool.definition.function.name === name) {
            activeTool = tool;
            break;
        }
    }
    if (!activeTool) {
        throw new Error(`${name} not registered as a tool.`);
    }
    return await activeTool.execute(args, context);
}