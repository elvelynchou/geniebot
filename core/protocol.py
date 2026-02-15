import json
import sys
import os
import redis
import time

class AgentMesh:
    """
    Implements the 'Mesh Protocol' using Redis Streams for persistent, 
    reliable autonomous agent-to-agent signaling.
    """
    STREAM_KEY = "genie:mesh:stream"

    @staticmethod
    def _get_client():
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
        return redis.from_url(REDIS_URL, decode_responses=True)

    @staticmethod
    def publish_event(event_type, payload):
        """
        Broadcasts an event to the mesh using Redis Streams.
        """
        try:
            r = AgentMesh._get_client()
            message = {
                "event": event_type,
                "timestamp": time.time(),
                "data": json.dumps(payload) # Streams store strings/bytes
            }
            # Add to stream with max length to prevent memory bloat
            r.xadd(AgentMesh.STREAM_KEY, message, maxlen=1000, approximate=True)
            
            # Keep legacy Pub/Sub for immediate compatibility if needed
            r.publish("genie:mesh:legacy_events", json.dumps(message))
            
            print(f"[MESH] Published persistent event: {event_type}")
        except Exception as e:
            print(f"[MESH ERROR] Failed to publish event: {e}")

    @staticmethod
    def subscribe(callback, event_types=None, group_name=None, consumer_name=None, last_id="0-0"):
        """
        Blocks and listens for events. Supports both individual catch-up and Consumer Groups.
        """
        r = AgentMesh._get_client()
        
        # 1. Consumer Group Logic
        if group_name:
            if not consumer_name:
                import socket
                consumer_name = f"genie_node_{socket.gethostname()}"
            
            # Create group if not exists
            try:
                r.xgroup_create(AgentMesh.STREAM_KEY, group_name, id=last_id, mkstream=True)
            except Exception: 
                pass

            print(f"[MESH] Listening as group '{group_name}' | consumer '{consumer_name}'")
            
            while True:
                results = r.xreadgroup(group_name, consumer_name, {AgentMesh.STREAM_KEY: ">"}, count=1, block=5000)
                if results:
                    for stream, messages in results:
                        for msg_id, data in messages:
                            try:
                                event_data = {
                                    "event": data['event'],
                                    "timestamp": float(data['timestamp']),
                                    "data": json.loads(data['data'])
                                }
                                if not event_types or event_data['event'] in event_types:
                                    callback(event_data)
                                r.xack(AgentMesh.STREAM_KEY, group_name, msg_id)
                            except Exception as e:
                                print(f"[MESH ERROR] Callback processing failed: {e}")
                continue

        # 2. Individual Catch-up Mode (Default)
        else:
            print(f"[MESH] Listening for stream events starting from {last_id}...")
            current_id = last_id
            while True:
                results = r.xread({AgentMesh.STREAM_KEY: current_id}, count=1, block=5000)
                if results:
                    for stream, messages in results:
                        for msg_id, data in messages:
                            event_data = {
                                "event": data['event'],
                                "timestamp": float(data['timestamp']),
                                "data": json.loads(data['data'])
                            }
                            if not event_types or event_data['event'] in event_types:
                                callback(event_data)
                            current_id = msg_id
                else:
                    continue

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
