import time
import json
import redis
import threading
from core.protocol import AgentMesh

REDIS_URL = "redis://localhost:6379/1"

def test_mesh_streams_persistence():
    """
    Proves that Redis Streams ALLOW catching up on historical messages.
    """
    r = redis.from_url(REDIS_URL, decode_responses=True)
    
    # 1. Clean start
    r.delete(AgentMesh.STREAM_KEY)
    
    # 2. Publish a message NOW
    test_payload = {"test": "persistent_data"}
    AgentMesh.publish_event("stream_event", test_payload)
    
    # 3. Start subscriber AFTER publication
    received_messages = []
    def callback(data):
        received_messages.append(data)

    def run_subscriber():
        try:
            # Subscribe is blocking, so we run it in a thread
            AgentMesh.subscribe(callback, last_id="0-0")
        except Exception:
            pass

    sub_thread = threading.Thread(target=run_subscriber, daemon=True)
    sub_thread.start()
    
    time.sleep(3) # Wait for processing

    # 4. ASSERTION
    if len(received_messages) > 0:
        print("[GREEN PHASE] Success! Message recovered after publication.")
        assert received_messages[0]['data']['test'] == "persistent_data"
    else:
        print("[GREEN PHASE] Failed: Message was not recovered.")
        assert False

if __name__ == "__main__":
    test_mesh_streams_persistence()
