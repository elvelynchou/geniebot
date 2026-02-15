const Redis = require("ioredis");
const { spawn } = require("child_process");
const fs = require("fs");

// Configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379/1";
const PROMPT_QUEUE = "genie:prompt:inbox";
const projectRoot = process.cwd();

// Connect to Redis
const redis = new Redis(REDIS_URL);
const pubClient = new Redis(REDIS_URL); // Dedicated client for pushing responses

console.log(`[Daemon] Genie Bridge Daemon Active. Listening on ${PROMPT_QUEUE}...`);

async function processLoop() {
    while (true) {
        try {
            // Blocking pop - waits until a job arrives
            const result = await redis.blpop(PROMPT_QUEUE, 0);
            const dataStr = result[1];
            const job = JSON.parse(dataStr);
            
            console.log(`[Daemon] Processing Request: ${job.id}`);
            await runGemini(job);
            
        } catch (error) {
            console.error("[Daemon] Error in loop:", error);
            // Sleep briefly to avoid tight loop on persistent error
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function runGemini(job) {
    const streamKey = `genie:stream:${job.id}`;
    const autoModels = ["auto-gemini-3", "auto-gemini-2.5"];
    
    // Helper to push chunk to Redis
    const pushChunk = async (text) => {
        await pubClient.rpush(streamKey, text);
        // Set expiry on stream key to prevent garbage buildup (1 hour)
        await pubClient.expire(streamKey, 3600);
    };

    const runModel = async (index) => {
        if (index >= autoModels.length) {
            await pushChunk("\n[SYSTEM ERROR]: All models quota exhausted.");
            await pushChunk("END_OF_STREAM");
            return;
        }

        const modelAlias = autoModels[index];
        const args = ["-m", modelAlias, "--yolo", "--output-format", "stream-json"];

        const child = spawn("gemini", args, {
            cwd: projectRoot,
            env: { ...process.env, FORCE_COLOR: "0" }
        });

        // Write prompt
        child.stdin.write(job.prompt);
        child.stdin.end();

        let quotaError = false;

        child.stdout.on("data", async (data) => {
            const chunk = data.toString();
            const lines = chunk.split('\n');
            
            for (let line of lines) {
                if (line.trim().startsWith('{')) {
                    try {
                        const json = JSON.parse(line);
                        if (json.type === "message" && json.role === "assistant" && json.content) {
                            await pushChunk(json.content);
                        }
                    } catch (e) {
                        // Not valid JSON or partial, ignore
                    }
                }
            }
        });

        child.stderr.on("data", (data) => {
            const stderr = data.toString();
            if (stderr.includes("error") || stderr.includes("INVALID_ARGUMENT")) {
                pushChunk("\n[API ERROR]: " + stderr.substring(0, 500));
            }
            if (/TerminalQuotaError|429|exhausted your capacity/.test(stderr)) {
                quotaError = true;
            }
        });

        child.on("close", async (code) => {
            if (quotaError) {
                await pushChunk("\n[System]: " + modelAlias + " busy. Switching...\n");
                await runModel(index + 1);
            } else {
                if (code !== 0) {
                    // await pushChunk("\n[System]: CLI exited with code " + code + "\n");
                }
                // Signal completion
                await pushChunk("END_OF_STREAM");
            }
        });
    };

    await runModel(0);
}

// Start the daemon
processLoop();
