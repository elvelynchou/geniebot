import redis
import json
import uuid
import os
import time

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
PROMPT_QUEUE = "genie:prompt:inbox"

def call_gemini(prompt, timeout=300):
    """
    Submits a job to the Node.js Daemon via Redis and yields streaming results.
    """
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        job_id = str(uuid.uuid4())
        stream_key = f"genie:stream:{job_id}"
        
        payload = {
            "id": job_id,
            "prompt": prompt
        }
        
        # 1. Push Request
        r.rpush(PROMPT_QUEUE, json.dumps(payload))
        
        # 2. Poll for Response Stream
        start_time = time.time()
        
        while True:
            # Check timeout
            if time.time() - start_time > timeout:
                yield "\n[Error]: Request timed out."
                break
            
            # Blocking pop from the specific stream key (10s timeout per chunk)
            result = r.blpop(stream_key, timeout=10)
            
            if result:
                _, chunk = result
                if chunk == "END_OF_STREAM":
                    break
                yield chunk
            else:
                # No data for 10s, might be processing or stuck
                # yield "." # Optional heartbeat
                continue

        # Cleanup (Optional, daemon sets expiry but good practice)
        r.delete(stream_key)

    except Exception as e:
        yield f"\n[System Error]: Failed to communicate with AI Bridge: {str(e)}"

def call_gemini_complete(prompt, timeout=300):
    """
    Helper to get the full response at once.
    """
    full_response = ""
    for chunk in call_gemini(prompt, timeout):
        full_response += chunk
    return full_response.strip()

if __name__ == "__main__":
    for chunk in call_gemini("Hello, are you ready?"):
        print(chunk, end="", flush=True)