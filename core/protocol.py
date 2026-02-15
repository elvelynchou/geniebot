import json
import sys
import os
import redis
import time

class AgentMesh:
    """
    Implements the 'Mesh Protocol' for autonomous agent-to-agent signaling via Redis.
    """
    @staticmethod
    def _get_client():
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
        return redis.from_url(REDIS_URL, decode_responses=True)

    @staticmethod
    def publish_event(event_type, payload):
        """
        Broadcasts an event to the mesh.
        Example: publish_event("image_ready", {"path": "/tmp/img.jpg"})
        """
        try:
            r = AgentMesh._get_client()
            message = {
                "event": event_type,
                "timestamp": time.time(),
                "data": payload
            }
            # 1. Publish to real-time channel
            r.publish(f"genie:mesh:events", json.dumps(message))
            # 2. Push to persistent event log (optional, useful for history)
            r.lpush(f"genie:mesh:log", json.dumps(message))
            r.ltrim(f"genie:mesh:log", 0, 99) # Keep last 100 events
            print(f"[MESH] Published event: {event_type}")
        except Exception as e:
            print(f"[MESH ERROR] Failed to publish event: {e}")

    @staticmethod
    def subscribe(callback, event_types=None):
        """
        Blocks and listens for events. Triggers callback on match.
        """
        try:
            r = AgentMesh._get_client()
            pubsub = r.pubsub()
            pubsub.subscribe(f"genie:mesh:events")
            print(f"[MESH] Listening for events...")
            
            for message in pubsub.listen():
                if message['type'] == 'message':
                    data = json.loads(message['data'])
                    if not event_types or data['event'] in event_types:
                        callback(data)
        except Exception as e:
            print(f"[MESH ERROR] Subscription failed: {e}")

class AgentResponse:
    @staticmethod
    def success(msg, data=None, publish_event=None):
        """Prints message and JSON data, then exits with 0."""
        print(msg)
        
        # Optional: Auto-publish event on success
        if publish_event:
            # publish_event is expected to be a tuple (event_type, payload)
            AgentMesh.publish_event(publish_event[0], publish_event[1])

        if data:
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "content" in item:
                        print("--- CONTENT START ---")
                        print(item['content'])
                        print("--- CONTENT END ---")
                    else:
                        print(json.dumps(item))
            else:
                print(json.dumps(data))
        sys.exit(0)

    @staticmethod
    def error(msg, data=None):
        """Prints error message and data, then exits with 1."""
        print(f"CRITICAL_ERROR: {msg}")
        if data:
            print(json.dumps(data))
        sys.exit(1)
