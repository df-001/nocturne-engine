import { MAX_TOKENS, TEMPERATURE, LLM_URL, LLM_MODEL, MAX_TOOL_TURNS } from "../config.js";
import { getToolDefinitions, getToolStatus, useTool } from "./tools/installed-tools.js";

async function executeToolCalls(toolCalls, messages, context) {
    for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const statusText = getToolStatus(tc.function.name, args);
        console.log(`<Tool> ${statusText}`);

        if (context.channel) {
            await context.channel.send(`*${statusText}*`);
        }

        const result = await useTool(tc.function.name, args, context);
        messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: String(result)
        });
    }
}

export async function processText({ prompt, temp = TEMPERATURE, sys_prompt = "", history = [], context = {} }) {
    try {
        const messages = [
            { role: "system", content: sys_prompt },
            ...history,
            { role: "user", content: prompt }
        ]

        for (let i = 0; i < MAX_TOOL_TURNS; i++) {
            const res = await fetch(LLM_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: messages,
                    tools: getToolDefinitions(),
                    temperature: temp,
                    max_tokens: MAX_TOKENS
                })
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

        return "Maximum tool uses exceeded."
    } catch (err) {
        console.warn(err)
        return "An error occurred during thinking.";
    }
}

export async function* processTextStream({ prompt, temp = TEMPERATURE, sys_prompt = "", history = [], context = {} }) {
    try {
        const messages = [
            { role: "system", content: sys_prompt },
            ...history,
            { role: "user", content: prompt }
        ]

        for (let i = 0; i < MAX_TOOL_TURNS; i++) {
            const res = await fetch(LLM_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: LLM_MODEL,
                    messages: messages,
                    tools: getToolDefinitions(),
                    temperature: temp,
                    max_tokens: MAX_TOKENS,
                    stream: true
                })
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

            const toolCallMap = {};

            while (true) {
                const { value, done } = await reader.read(); // Receives packet
                if (done) break; // Handles stream end

                // Expected delta format -> data: {"choices":[{"delta":{"content":"hi"}}
                const lines = value.split("\n"); // Splits packets if required
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

                        // Accumulate text content and stream it to the caller
                        if (delta.content) {
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
                    } catch (e) {
                        // Skip malformed packets
                    }
                }
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