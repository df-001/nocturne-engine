export const getCurrentTime = {
    definition: {
        type: "function",
        function: {
            name: "get_current_time",
            description: "Returns the current time at the server location.",
            parameters: { type: "object", properties: {}, additionalProperties: false }
        }
    },

    status: () => "Checking time...",

    async execute(_args, _context) {
        const options = {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        };

        return new Date().toLocaleString("en-GB", options);
    }
};