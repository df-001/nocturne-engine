import admin from "firebase-admin";
import { FIREBASE_PROJECT_ID } from "../config.js";

admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
console.log(`Firebase Admin initialized with project ID: ${FIREBASE_PROJECT_ID}`);


export const auth = admin.auth();

/**
 * Express middleware to validate incoming Firebase ID tokens
 */
export async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Unauthorized: Missing or invalid authorization header. Expected 'Bearer <token>'"
        });
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (e) {
        console.warn(e);
        return res.status(401).json({
            error: "Unauthorized: Invalid or expired token"
        });
    }
}
