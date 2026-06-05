import js from "@eslint/js";
export default [
    js.configs.recommended,
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: { // Readonly globals, not reassignable
                console: "readonly",
                process: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                fetch: "readonly",
                Buffer: "readonly",
                TextDecoderStream: "readonly",
            },
        },
        // Custom project styling ruleset
        rules: {
            "quotes": ["error", "double", { avoidEscape: true }],
            "indent": ["error", 4],
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "semi": ["error", "always"],
        },
    },
];