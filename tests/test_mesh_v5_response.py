import json
import redis
import pytest
from core.protocol import AgentMesh, AgentResponse
import os
import sys

REDIS_URL = "redis://localhost:6379/1"

def test_agent_response_success_stream_integration(monkeypatch):
    """
    Tests that AgentResponse.success correctly triggers a stream event.
    """
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.delete(AgentMesh.STREAM_KEY)
    
    # Mock sys.exit
    exited = []
    def mock_exit(code):
        exited.append(code)
    monkeypatch.setattr("sys.exit", mock_exit)
    
    # Trigger success with an event
    AgentResponse.success("Task done", publish_event=("response_event", {"val": 123}))
    
    # Verify stream has the event
    results = r.xread({AgentMesh.STREAM_KEY: "0-0"}, count=1)
    assert len(results) > 0
    
    data = results[0][1][0][1]
    assert data['event'] == "response_event"
    assert json.loads(data['data'])['val'] == 123
    assert exited == [0]
    
    print("[GREEN PHASE] Success! AgentResponse integrated with Streams.")
