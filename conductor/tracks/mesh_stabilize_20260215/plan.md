# Implementation Plan: Validate and Stabilize Mesh Protocol

## Phase 1: Foundation & Reliability Enhancements
This phase focuses on upgrading the core `AgentMesh` logic to ensure reliability and event persistence.

- [x] Task: Create comprehensive unit tests for current `AgentMesh` implementation. (b06c367)
    - [x] Write tests for `publish_event` and `subscribe`.
    - [x] Identify race conditions or message loss scenarios during subscriber downtime.
- [ ] Task: Upgrade `core/protocol.py` to use Redis Streams for persistent event delivery.
    - [ ] Implement consumer groups support in `AgentMesh.subscribe`.
    - [ ] Update `publish_event` to write to a Redis Stream (`genie:mesh:stream`).
- [ ] Task: Refactor `AgentResponse` to leverage the new stream-based signaling.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation' (Protocol in workflow.md)

## Phase 2: Agent Integration & Stress Testing
This phase ensures all specialized agents are correctly using the stabilized protocol.

- [ ] Task: Update `imggen` to use the new stream-based `publish_event`.
    - [ ] Verify `image_ready` events are correctly recorded in the stream.
- [ ] Task: Update `socialpub` to use consumer groups for reliable listening.
    - [ ] Test scenario: Stop `socialpub`, generate an image, then restart `socialpub` to verify it catches up.
- [ ] Task: Update `vault` to use the new mesh protocol for archiving.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Integration' (Protocol in workflow.md)

## Phase 3: Monitoring & Observability
This phase adds tools to visualize and monitor the health of the agent mesh.

- [ ] Task: Implement `mesh_monitor` diagnostic tool.
    - [ ] Function: List all active consumer groups and pending messages.
    - [ ] Function: Clear stale events from the mesh.
- [ ] Task: Integrate mesh health stats into the `sys_check` agent.
- [ ] Task: Final System Integration Test.
    - [ ] Run full loop: `imggen` -> `socialpub` -> `vault`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Monitoring' (Protocol in workflow.md)
