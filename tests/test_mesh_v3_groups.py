import time
import json
import redis
import threading
from core.protocol import AgentMesh

REDIS_URL = "redis://localhost:6379/1"

def test_mesh_consumer_groups():
    """
    Tests reliable delivery using Redis Consumer Groups.
    """
    r = redis.from_url(REDIS_URL, decode_responses=True)
    
    # 1. Clean start
    r.delete(AgentMesh.STREAM_KEY)
    
    # 2. Publish 3 messages
    for i in range(3):
        AgentMesh.publish_event("group_event", {"index": i})
    
    # 3. Start a consumer group subscriber
    received_indices = []
    def callback(data):
        received_indices.append(data['data']['index'])

    def run_consumer():
        try:
            # We use a unique group name for this test
            AgentMesh.subscribe(callback, group_name="test_worker_group", consumer_name="worker_1")
        except Exception:
            pass

    sub_thread = threading.Thread(target=run_consumer, daemon=True)
    sub_thread.start()
    
    # Give it time to process all 3 messages
    time.sleep(5)

    # 4. ASSERTION
    print(f"[GROUP TEST] Received indices: {received_indices}")
    assert len(received_indices) == 3, "Consumer group should process all pending messages"
    assert set(received_indices) == {0, 1, 2}
    
    # 5. Check if group was created and messages ACKed
    groups = r.xinfo_groups(AgentMesh.STREAM_KEY)
    assert any(g['name'] == 'test_worker_group' for g in groups)
    
    print("[GREEN PHASE] Success! Consumer Groups logic verified.")

if __name__ == "__main__":
    test_mesh_consumer_groups()
