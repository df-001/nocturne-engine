import ivm from "isolated-vm";


async function runSandbox(code, timeoutSec = 2, memoryLimitMB = 16) {
    const isolate = new ivm.Isolate({ memoryLimit: memoryLimitMB });
    try {
        const context = isolate.createContextSync();
        const jail = context.global;

        jail.setSync("global", jail.derefInto());

        let stdoutResult = [];

        // copy and sanitize output to array
        const logCallback = new ivm.Callback((...args) => {
            stdoutResult.push(args.map(String).join(" "));
        });

        // create new "console" object in the sandbox
        jail.setSync("console", new ivm.ExternalCopy({}).copyInto());

        // attach callback logger to said object
        jail.getSync("console").setSync("log", logCallback); 

        const script = isolate.compileScriptSync(code);
        await script.run(context, { timeout: timeoutSec * 1000, copy: true });
        return stdoutResult;
    } catch (e) {
        console.warn(e);
    } finally {
        isolate.dispose();
    }
}

export const runCode = {
    definition: {
        type: "function",
        function: {
            name: "run_js_code",
            description: "Runs a JavaScript container to run code, ONLY base dependencies are available. Returns stdout",
            parameters: {
                type: "object",
                properties: {
                    script: { type: "string", description: "The JavaScript code to execute." }
                },
                required: ["script"],
                additionalProperties: false
            }
        }
    },

    status: () => "Running code...",

    async execute(args, _context) {
        const { script } = args;

        try {
            const result = await runSandbox(script);
            console.log("    Input script:", script);
            console.log("    Execution result:", result);
            return result;
        } catch (e) {
            console.warn(e.name, e.message);
            return `Script ran with error(s):\n${e.message}`;
        }
    }
};