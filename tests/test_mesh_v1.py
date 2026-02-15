import time
import json
import redis
import threading
import pytest
from core.protocol import AgentMesh

REDIS_URL = "redis://localhost:6379/1"

def test_mesh_pubsub_loss_scenario():
    """
    Demonstrates that messages are LOST if published when no one is listening.
    This is the standard behavior of Redis Pub/Sub which we want to fix.
    """
    r = redis.from_url(REDIS_URL, decode_responses=True)
    
    # 1. Ensure clean state
    r.delete("genie:mesh:events")
    
    # 2. Publish a message BEFORE any subscriber exists
    test_payload = {"test": "data"}
    AgentMesh.publish_event("test_event", test_payload)
    
    # 3. Now start a subscriber
    received_messages = []
    def callback(data):
        received_messages.append(data)

    def run_subscriber():
        try:
            client = redis.from_url(REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            pubsub.subscribe("genie:mesh:events")
            start = time.time()
            # Non-blocking check for messages in a loop
            while time.time() - start < 3:
                message = pubsub.get_message(ignore_subscribe_messages=True)
                if message:
                    data = json.loads(message['data'])
                    callback(data)
                time.sleep(0.1)
        except Exception:
            pass

    sub_thread = threading.Thread(target=run_subscriber)
    sub_thread.start()
    sub_thread.join()

    # 4. ASSERTION: The message was LOST (list is empty)
    assert len(received_messages) == 0
    print("[RED PHASE] Confirmed: Message was lost as expected in current Pub/Sub implementation.")

if __name__ == "__main__":
    test_mesh_pubsub_loss_scenario()
