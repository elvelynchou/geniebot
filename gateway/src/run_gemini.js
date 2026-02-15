const { spawn } = require("child_process");
const fs = require("fs");

// Use local project root
const projectRoot = process.cwd();

// 1. Define the requested Auto groups
const autoModels = ["auto-gemini-3", "auto-gemini-2.5"];

// Support reading from stdin if no argument is provided
let prompt = "";
try {
    prompt = fs.readFileSync(0, "utf-8");
} catch (e) {
    process.exit(1);
}

if (!prompt || prompt.trim().length === 0) process.exit(1);

async function runModel(index) {
    if (index >= autoModels.length) {
        process.stderr.write(`🚨 ALL MODELS QUOTA EXHAUSTED for current identity.
`);
        process.exit(42);
    }

    const modelAlias = autoModels[index];
    const args = ["-m", modelAlias, "--yolo"];
    
    const child = spawn("gemini", args, {
        cwd: projectRoot
    });

    // Write prompt to gemini's stdin
    child.stdin.write(prompt);
    child.stdin.end();

    let stdoutReceived = false;
    let quotaErrorDetected = false;

    child.stdout.on("data", (data) => {
        const chunk = data.toString();
        const lines = chunk.split('\n');
        
        for (let line of lines) {
            const isNoise = /YOLO mode|Loaded cached credentials|Loading extension|Hook registry|supports tool updates|discovery for MCP|Error resuming session/.test(line);
            if (!isNoise && line.trim().length > 0) {
                process.stdout.write(line + "\n");
                stdoutReceived = true;
            }
        }
    });

    child.stderr.on("data", (data) => {
        const stderr = data.toString();
        if (/TerminalQuotaError|429|exhausted your capacity/.test(stderr)) {
            quotaErrorDetected = true;
        }
    });

    return new Promise((resolve) => {
        child.on("close", async (code) => {
            if (quotaErrorDetected) {
                process.stdout.write(`
⚠️ **Model Quota Warning**: ${modelAlias} exhausted. Switching to backup...
`);
                resolve(await runModel(index + 1));
            } else {
                resolve(code);
            }
        });
    });
}

runModel(0).then((code) => {
    process.exit(code);
});
