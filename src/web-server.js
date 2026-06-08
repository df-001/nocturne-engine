import express from "express";
import helmet from "helmet";
import cors from "cors";
import { authenticateUser } from "./api/firebase.js";
import { API_PORT } from "./config.js";

import conversationRoute from "./api/routes/conversations.js";

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(cors()); // Open to all routes for now, subject to change
app.use(helmet());

// Public routes
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Protected routes
app.use(authenticateUser);

app.use(conversationRoute);

// Stub

// API listener
app.listen(API_PORT, () => {
    console.log(`API running on port ${API_PORT}`);
});
