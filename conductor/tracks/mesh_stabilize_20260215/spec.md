# Track Specification: Validate and Stabilize Mesh Protocol

## 1. Overview
The **Mesh Protocol** is the backbone of GenieBot's autonomous coordination. Currently, it relies on Redis Pub/Sub for real-time events and Lists for persistent logging. As we transition to a "GenieOS" architecture, this protocol must be bulletproof, ensuring no events are lost and that agents can recover from infrastructure hiccups.

## 2. Goals & Objectives
- **Zero Event Loss**: Implement a mechanism to ensure events are processed even if an agent was offline at the time of broadcast.
- **Error Resilience**: Standardize how agents handle failed callbacks or malformed payloads.
- **Performance Benchmarking**: Validate the latency and reliability of the `AgentMesh` class under load.
- **Tracing**: Ensure every event can be traced from origin to all processed sinks.

## 3. Technical Requirements
- **Core Update**: Extend `core/protocol.py` to support "at-least-once" delivery patterns.
- **Agent Integration**: Update `imggen` and `socialpub` to use the stabilized protocol.
- **Monitoring**: Create a specialized `mesh_monitor` script or integrate it into `sys_check`.

## 4. Acceptance Criteria
- [ ] Multiple agents can simultaneously subscribe to the same event type without conflicts.
- [ ] Events published while a subscriber is restarting are correctly retrieved upon reconnection (using Redis Stream or sorted sets).
- [ ] A "Health Check" event propagates through the mesh and returns a status report.
- [ ] Automated tests achieve >80% coverage for the `AgentMesh` module.

## 5. Constraints
- Must use existing Redis DB 1.
- Must remain compatible with Python 3.12 and the JSON IPC standard.
- Must not introduce significant latency to the AI reasoning loop.
