import express from "express";
import helmet from "helmet";
import cors from "cors";
import { authenticateUser } from "./api/firebase.js";
import { rateLimiter } from "./api/rate-limiter.js";
import { API_PORT, CORS_ORIGINS } from "./config.js";

import conversationRoute from "./api/routes/conversations.js";
import chatRoute from "./api/routes/chat.js";

const app = express();

app.use(express.json({ limit: "16mb" }));
app.use(cors({ origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : "*" }));
app.use(helmet());

// Public routes
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Protected routes
app.use(authenticateUser);
app.use(rateLimiter);

app.use(conversationRoute);
app.use(chatRoute);

// Stub app.use(memoryRoute);

// API listener
app.listen(API_PORT, () => {
    console.log(`API running on port ${API_PORT}`);
});
