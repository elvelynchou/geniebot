from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import JSONResponse
import redis
import requests
import os
import json

app = FastAPI(title="ClawProxy - Token-Blind Injection Sidecar")

# Redis for secret storage
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
r = redis.from_url(REDIS_URL, decode_responses=True)

# Service to Secret Mapping
SERVICE_MAP = {
    "modelscope": "MODELSCOPE_API_KEY",
    "x": "X_AUTH_TOKEN",
    "twitter": "X_AUTH_TOKEN",
    "gemini": "GEMINI_API_KEY"
}

@app.get("/health")
async def health():
    return {"status": "running", "blind_mode": True}

@app.api_route("/v1/proxy/{service_name}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_request(service_name: str, request: Request, x_genie_agent: str = Header(None)):
    if not x_genie_agent:
        raise HTTPException(status_code=403, detail="Agent identity missing")

    secret_key = SERVICE_MAP.get(service_name.lower())
    if not secret_key:
        raise HTTPException(status_code=400, detail=f"Unsupported service: {service_name}")

    token = r.hget("genie:sys:secrets", secret_key)
    if not token:
        raise HTTPException(status_code=500, detail=f"Secret {secret_key} not found")

    try:
        body = await request.json()
    except Exception:
        body = {}

    target_url = body.get("url") or request.query_params.get("url")
    if not target_url:
        raise HTTPException(status_code=400, detail="Target 'url' missing")

    method = body.get("method", "POST" if request.method == "POST" else "GET")
    payload = body.get("payload")
    headers = body.get("headers", {})
    
    headers["Authorization"] = f"Bearer {token}"
    
    try:
        resp = requests.request(
            method=method,
            url=target_url,
            json=payload if payload is not None else None,
            headers=headers,
            timeout=60
        )
        try:
            resp_data = resp.json()
        except Exception:
            resp_data = {"raw_output": resp.text}
        return JSONResponse(status_code=resp.status_code, content=resp_data)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
