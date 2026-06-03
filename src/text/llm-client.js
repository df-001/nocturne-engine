import { MAX_TOKENS, TEMPERATURE, LLM_URL, LLM_MODEL } from "../config.js";

export async function processText({ prompt, temp = TEMPERATURE, sys_prompt = "", history = [] }) {
    try {
        console.log(prompt)
        const res = await fetch(LLM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "LLM_MODEL",
                messages: [
                    { role: "system", content: sys_prompt },
                    ...history,
                    { role: "user", content: prompt }
                ],
                temperature: temp,
                max_tokens: MAX_TOKENS
            })
        });
        const data = await res.json();
        return data.choices[0].message.content;
    } catch (err) {
        console.warn(err)
        return "An error occurred during thinking.";
    }
}

export async function* processTextStream({ prompt, temp = TEMPERATURE, sys_prompt = "", history = [] }) {
    try {
        console.log(prompt);
        const res = await fetch(LLM_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "LLM_MODEL",
                messages: [
                    { role: "system", content: sys_prompt },
                    ...history,
                    { role: "user", content: prompt }
                ],
                temperature: temp,
                max_tokens: MAX_TOKENS,
                stream: true
            })
        });

        // Stream decode binary to UTF-8
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

        while (true) {
            const { value, done } = await reader.read(); // Recieves packet
            if (done) break; // Handles stream end

            // Expected delta format -> data: {"choices":[{"delta":{"content":"hi"}}
            const lines = value.split("\n"); // Splits packets if required
            for (const line of lines) {
                const cleaned = line.replace(/^data: /, "").trim();
                if (!cleaned || cleaned === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(cleaned);
                    const chunk = parsed.choices[0]?.delta?.content;
                    if (chunk) yield chunk; // Returns text chunk
                } catch (e) {
                    // Skip malformed packets
                }
            }
        }
    } catch (err) {
        console.warn(err)
        yield "An error occurred during thinking.";
    }
}