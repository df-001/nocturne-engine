import express from "express";
import { WEB_SYSTEM_PROMPT, TEMPERATURE } from "../../config.js";
import { processTextStream } from "../../llm/llm-client.js";
import { getConversation, appendChatMessage } from "../db-helpers.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
    const uid = req.user.uid;
    const { prompt, conversationId } = req.body;

    if (!prompt || !conversationId) {
        return res.status(400).json({
            success: false,
            error: "Missing prompt or conversationId."
        });
    }

    try {
        const history = getConversation(uid, conversationId);
        if (!history) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found."
            });
        }

        const cleanHistory = []; // Removes values like created_at which can crash the LLM endpoint
        for (const message of history) {
            cleanHistory.push({
                role: message.role,
                content: message.content
            });
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        res.flushHeaders();

        const textStream = processTextStream({
            prompt,
            temp: TEMPERATURE,
            sys_prompt: WEB_SYSTEM_PROMPT,
            history: cleanHistory,
            context: {
                // Tool context for notifying web user of tool calls
                onToolStatus: (statusText) => {
                    res.write(`data: ${JSON.stringify({ toolStatus: statusText })}\n\n`);
                }
            }
        });

        appendChatMessage(conversationId, "user", prompt);

        let response = "";
        for await (const chunk of textStream) {
            response += chunk;
            // Format data as valid SSE: "data: <payload>\n\n"
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        appendChatMessage(conversationId, "assistant", response);

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (e) {
        console.warn(`Streaming failure on /chat for user ${uid}: ${e}`);

        // Failure before stream
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: "Internal Server Error: Failed to initialize chat stream."
            });
        }

        // Failure during stream
        res.write(`data: ${JSON.stringify({ error: "The live text stream was disrupted mid-generation." })}\n\n`);
        res.end();
    }
});


export default router;