import express from "express";
import crypto from "node:crypto";

import { getIndex, createConversation, getConversation, deleteChat } from "../db-helpers.js";

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
        const data = getIndex(uid);

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

router.get("/conversations/:id", async (req, res) => {
    const uid = req.user.uid;
    const conversationId = req.params.id;

    try {
        const data = getConversation(uid, conversationId);

        return res.status(200).json({
            success: true,
            conversation: data
        });
    } catch (e) {
        console.warn(`Error retrieving conversation for ${uid}: ${e}`);

        return res.status(500).json({
            success: false,
            error: "Failed to retrieve conversation history."
        });
    }
});


router.post("/conversations", async (req, res) => {
    const uid = req.user.uid;
    const conversationId = crypto.randomUUID();

    try {
        createConversation(uid, conversationId);

        const newMetadata = {
            id: conversationId,
            title: "New Chat",
            updatedAt: Date.now()
        };

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
        const isDeleted = deleteChat(uid, conversationId);

        if (isDeleted) {
            return res.status(200).json({
                success: true,
                message: "Conversation successfully deleted."
            });
        } else {
            return res.status(404).json({
                success: false,
                error: "Conversation not found or unauthorized access."
            });
        }
    } catch (e) {
        console.warn(`Database failure during deletion: ${e}`);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error: Failed to complete deletion request."
        });
    }
});


export default router;