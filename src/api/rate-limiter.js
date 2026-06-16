import { rateLimit, ipKeyGenerator } from "express-rate-limit";

console.log("Initializing rate limiter...");

/*
 * Express middleware to rate limit by uid/ip
 */
export const rateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 128, // limit each IP to 128 requests per windowMs
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.uid ? req.user.uid : ipKeyGenerator(req.ip, 48); // Use uid if logged in
    }
});