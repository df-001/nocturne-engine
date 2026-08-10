export const getCurrentTime = {
    definition: {
        type: "function",
        function: {
            name: "get_current_time",
            description: "Returns the current time.",
            parameters: {
                type: "object",
                properties: {
                    timezone: {
                        type: "string",
                        description: "The IANA timezone identifier (e.g., \"Europe/London\", \"America/New_York\", \"UTC\"). Defaults to \"Europe/London\"."
                    }
                },
                additionalProperties: false
            }
        }
    },

    status: (args) => args?.timezone ? `Checking time for ${args.timezone}...` : "Checking time for Europe/London...",

    async execute(args, _context) {
        const timezone = args?.timezone || "Europe/London";
        const options = {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: timezone
        };

        try {
            return new Date().toLocaleString("en-GB", options);
        } catch {
            options.timeZone = "Europe/London";
            return new Date().toLocaleString("en-GB", options);
        }
    }
};