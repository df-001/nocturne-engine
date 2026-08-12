import { MAX_TOKENS, TEMPERATURE, LLM_URL, LLM_MODEL, MAX_TOOL_TURNS, ENABLE_TOOLS } from "../config.js";
import { getToolDefinitions, getToolStatus, useTool } from "./tools/installed-tools.js";

async function executeToolCalls(toolCalls, messages, context) {
    for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const statusText = getToolStatus(tc.function.name, args);
        console.log(`<Tool> ${statusText}`);

        // Notify tool calls for api + discord
        if (context.onToolStatus) {
            await context.onToolStatus(statusText);
        }

        const result = await useTool(tc.function.name, args, context);
        messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: String(result)
        });
    }
}

function formatUserContent(prompt, images) {
    // Add images from web client to prompt
    if (!images || images.length === 0) {
        return prompt;
    }

    const promptText = typeof prompt === "string" ? prompt : (prompt[0]?.text || "");
    const content = [
        {
            type: "text",
            text: promptText
        }
    ];

    for (const img of images) {
        content.push({
            type: "image_url",
            image_url: {
                url: img
            }
        });
    }

    return content;
}

export async function processText({ prompt, images = [], temp = TEMPERATURE, model = LLM_MODEL, tools_enabled = ENABLE_TOOLS, sys_prompt = "", history = [], context = {} }) {
    try {
        const assembledPrompt = formatUserContent(prompt, images);
        const messages = [
            { role: "system", content: sys_prompt },
            ...history,
            { role: "user", content: assembledPrompt }
        ];

        for (let i = 0; i < MAX_TOOL_TURNS; i++) {
            const body = {
                model: model,
                messages: messages,
                temperature: temp,
                max_tokens: MAX_TOKENS
            };
            if (tools_enabled) {
                body.tools = getToolDefinitions();
            }

            const res = await fetch(LLM_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                return "No response from server.";
            }

            const data = await res.json();
            const choice = data.choices[0];

            messages.push(choice.message);
            // Ends turn
            if (choice.finish_reason !== "tool_calls") {
                return choice.message.content;
            }
            // Runs tool call and loops
            await executeToolCalls(choice.message.tool_calls, messages, context);
        }

        return "Maximum tool uses exceeded.";
    } catch (err) {
        console.warn(err);
        return "An error occurred during thinking.";
    }
}

export async function* processTextStream({ prompt, images = [], temp = TEMPERATURE, model = LLM_MODEL, tools_enabled = ENABLE_TOOLS, sys_prompt = "", history = [], context = {} }) {
    try {
        const assembledPrompt = formatUserContent(prompt, images);
        const messages = [
            { role: "system", content: sys_prompt },
            ...history,
            { role: "user", content: assembledPrompt }
        ];

        for (let i = 0; i < MAX_TOOL_TURNS; i++) {
            const body = {
                model: model,
                messages: messages,
                temperature: temp,
                max_tokens: MAX_TOKENS,
                stream: true
            };
            if (tools_enabled) {
                body.tools = getToolDefinitions();
            }

            const res = await fetch(LLM_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                yield "An error occurred during thinking.";
                return;
            }

            // Stream decode binary to UTF-8
            const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

            // Accumulated state for the current turn
            let assistantContent = "";
            let finishReason = null;
            let buffer = "";

            const toolCallMap = {};

            while (true) {
                const { value, done } = await reader.read(); // Receives packet

                // If full delta not present, buffer and reconstruct before processing
                const chunk = value || "";
                buffer += chunk;

                const lines = buffer.split("\n");
                if (!done) {
                    buffer = lines.pop();
                } else {
                    buffer = "";
                }

                // Expected delta format -> data: {"choices":[{"delta":{"content":"hi"}}
                for (const line of lines) {
                    const cleaned = line.replace(/^data: /, "").trim();
                    if (!cleaned || cleaned === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(cleaned);
                        const choice = parsed.choices[0];
                        if (!choice) continue;

                        // Capture finish reason when it arrives
                        if (choice.finish_reason) {
                            finishReason = choice.finish_reason;
                        }

                        const delta = choice.delta;
                        if (!delta) continue;

                        // Accumulate existing text content and stream it to the caller
                        if (delta?.content?.length) {
                            assistantContent += delta.content;
                            yield delta.content;
                        }

                        // Finds deltas and assembles strings based off them > 
                        // id > name > arguments
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                if (!toolCallMap[tc.index]) {
                                    toolCallMap[tc.index] = { id: "", type: "function", function: { name: "", arguments: "" } };
                                }
                                const entry = toolCallMap[tc.index];
                                if (tc.id) entry.id += tc.id;
                                if (tc.function?.name) entry.function.name += tc.function.name;
                                if (tc.function?.arguments) entry.function.arguments += tc.function.arguments;
                            }
                        }
                    } catch {
                        // Skip malformed packets
                    }
                }

                if (done) break;
            }

            // Build the assistant message from this turn
            const toolCalls = Object.values(toolCallMap);
            const assistantMessage = { role: "assistant", content: assistantContent || null };
            if (toolCalls.length > 0) assistantMessage.tool_calls = toolCalls;
            messages.push(assistantMessage);

            // Text end
            if (finishReason !== "tool_calls") return;

            // If tools requested
            await executeToolCalls(toolCalls, messages, context);
        }

        yield "Maximum tool uses exceeded.";

    } catch (err) {
        console.warn(err);
        yield "An error occurred during thinking.";
    }
}