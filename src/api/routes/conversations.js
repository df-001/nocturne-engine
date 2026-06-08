import express from "express";
import crypto from "crypto";

import { initializeWebDatabase, getIndex, createConversation, touchIndex, deleteChat } from "../db-helpers.js";

initializeWebDatabase();
const router = express.Router();

/*
Data structure
web/
    firebaseUUID/
        conversationId.json
        index.json
*/

router.get("/conversations", async (req, res) => {
    const uid = req.user.uid;

    try {
        const data = await getIndex(uid);

        return res.status(200).json({
            success: true,
            conversations: data
        });
    } catch (e) {
        console.warn(`Error retrieving index for ${uid}: ${e}`);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error: Failed to retrieve conversation list."
        });
    }
});

router.post("/conversations", async (req, res) => {
    const uid = req.user.uid;
    const conversationId = crypto.randomUUID();

    try {
        await createConversation(uid, conversationId);

        const newMetadata = {
            id: conversationId,
            title: "New Chat",
            updatedAt: Date.now()
        };

        await touchIndex(uid, newMetadata);

        return res.status(201).json({
            success: true,
            conversationId,
            metadata: newMetadata
        });

    } catch (e) {
        console.warn(`Error creating conversation for ${uid}: ${e}`);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error: Failed to create conversation."
        });
    }
});

router.delete("/conversations/:id", async (req, res) => {
    const uid = req.user.uid;
    const conversationId = req.params.id;

    try {
        await deleteChat(uid, conversationId);

        return res.status(200).json({ 
            success: true, 
            message: "Conversation successfully deleted." 
        });
    } catch (e) {
        console.warn(`Error deleting chat: ${e}`);

        if (e.code === "ENOENT") {
            return res.status(404).json({
                success: false,
                error: "Conversation not found."
            });
        } else {
            return res.status(500).json({
                success: false,
                error: "Failed to delete conversation."
            });
        }
    }
});


export default router;