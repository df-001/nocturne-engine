import express from "express";
import helmet from "helmet";
import cors from "cors";
import { authenticateUser } from "./api/firebase.js";
import { rateLimiter } from "./api/rate-limiter.js";
import { API_PORT, CORS_ORIGINS } from "./config.js";

import conversationRoute from "./api/routes/conversations.js";
import chatRoute from "./api/routes/chat.js";
import mediaRoute from "./api/routes/media.js";
import uploadRoute from "./api/routes/upload.js";
import presetsRoute from "./api/routes/presets.js";

const app = express();

app.use(express.json({ limit: "16mb" }));
app.use(cors({ origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : "*" }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Public routes
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
app.use(mediaRoute);

// Protected routes
app.use(authenticateUser);
app.use(rateLimiter);

app.use(uploadRoute);
app.use(conversationRoute);
app.use(chatRoute);
app.use(presetsRoute);

// Stub app.use(memoryRoute);

// API listener
app.listen(API_PORT, () => {
    console.log(`API running on port ${API_PORT}`);
});
