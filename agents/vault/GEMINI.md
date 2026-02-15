# Vault Agent (Artifact Management)

## 1. Agent Overview
**Purpose**: Centralized storage, versioning, and indexing for all GenieBot generated outputs.
**Mode**: Mesh Listener (Autonomous).

## 2. Storage Schema
- `storage/images/`: Final AI-generated artwork.
- `storage/documents/`: Scraped content and reports.
- `storage/snapshots/`: Browser interaction proofs.
- `storage/metadata/`: JSON indices for searchability.

## 3. Usage
```bash
# Start the vault listener
venv/bin/python3 src/main.py
```

## 4. Operational Logic
When an agent publishes a `*_ready` event to the Redis Mesh, the Vault:
1. Validates the file existence.
2. Copies it to the typed storage folder.
3. Generates a metadata file mapping the artifact to its original prompt/context.
