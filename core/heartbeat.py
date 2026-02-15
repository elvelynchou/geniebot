import redis
import json
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
REDIS_RESPONSE_KEY = "genie:response:outbox"
TG_CHAT_ID = os.getenv("TG_USER_ID")

def send_to_tg(text):
    if not TG_CHAT_ID: return
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.rpush(REDIS_RESPONSE_KEY, json.dumps({"chat_id": TG_CHAT_ID, "text": f"💓 [System Heartbeat]\n{text}"}))

if __name__ == "__main__":
    send_to_tg("System Monitoring Active. Bridge-03 Pulse confirmed.")