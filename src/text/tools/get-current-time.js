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
        return new Date().toISOString();
    }
};