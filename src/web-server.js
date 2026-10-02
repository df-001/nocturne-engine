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

const allowedOrigins = [
    ...CORS_ORIGINS,
    /^https:\/\/[a-zA-Z0-9-]+\.nocturne-ai\.pages\.dev$/
];

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
