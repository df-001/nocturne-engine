import admin from "firebase-admin";
import { FIREBASE_PROJECT_ID } from "../config.js";

admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
console.log(`Firebase Admin initialized with project ID: ${FIREBASE_PROJECT_ID}`);


export const auth = admin.auth();
const localCache = new Map();

/**
 * Express middleware to validate and cache incoming Firebase ID tokens
 */
export async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized: Missing or invalid authorization header. Expected 'Bearer <token>'"
        });
    }

    const token = authHeader.split("Bearer ")[1];

    const now = Math.floor(Date.now() / 1000); // Convert because .exp is in seconds

    if (localCache.has(token)) {
        const decodedToken = localCache.get(token);
        // If token isn't expired
        if (decodedToken.exp >= now) {
            req.user = decodedToken;
            return next();
        } else {
            localCache.delete(token);
        }
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);

        localCache.set(token, decodedToken);

        req.user = decodedToken;
        next();
    } catch (e) {
        console.warn(e);
        return res.status(401).json({
            error: "Unauthorized: Invalid or expired token"
        });
    }
}
