import time
import json
import redis
import threading
from core.protocol import AgentMesh

REDIS_URL = "redis://localhost:6379/1"

def test_mesh_callback_failure():
    """
    Tests that the subscriber loop survives a failing callback.
    """
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.delete(AgentMesh.STREAM_KEY)
    
    AgentMesh.publish_event("failing_event", {"data": "fail"})
    AgentMesh.publish_event("success_event", {"data": "ok"})
    
    received = []
    def messy_callback(data):
        if data['event'] == "failing_event":
            raise ValueError("Boom!")
        received.append(data['event'])

    def run_consumer():
        try:
            # Short run
            AgentMesh.subscribe(messy_callback, group_name="error_group")
        except Exception:
            pass

    sub_thread = threading.Thread(target=run_consumer, daemon=True)
    sub_thread.start()
    
    time.sleep(3)
    
    # Success event should still be processed even after failure
    assert "success_event" in received
    print("[GREEN PHASE] Success! Mesh survived callback crash.")

if __name__ == "__main__":
    test_mesh_callback_failure()
