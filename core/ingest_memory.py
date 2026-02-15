import os
import re
from core.vector_store import VectorStore

def ingest_all():
    store = VectorStore()
    chunk_count = 0

    # 2. Ingest SOUL
    soul_path = "SOUL.md"
    if os.path.exists(soul_path):
        with open(soul_path, "r") as f:
            content = f.read()
            store.ingest(content, "project_soul")
            chunk_count += 1

    # 3. Ingest DNA (Granularly)
    gemini_path = "GEMINI.md"
    if os.path.exists(gemini_path):
        with open(gemini_path, "r") as f:
            content = f.read()
            # Split by markdown headers
            sections = re.split(r'\n(?=## )', content)
            for i, section in enumerate(sections):
                if section.strip():
                    store.ingest(section.strip(), f"dna_section_{i}")
                    chunk_count += 1

    # 4. Ingest Agent Info
    agents_dir = "agents"
    if os.path.exists(agents_dir):
        for name in os.listdir(agents_dir):
            agent_path = os.path.join(agents_dir, name)
            if os.path.isdir(agent_path):
                agent_dna_path = os.path.join(agent_path, "GEMINI.md")
                if os.path.exists(agent_dna_path):
                    with open(agent_dna_path, "r") as f:
                        content = f.read()
                        store.ingest(content, f"agent_{name}_dna")
                        chunk_count += 1

    print(f"Ingestion complete: [{chunk_count}] chunks saved to Redis DB 1.")

if __name__ == "__main__":
    ingest_all()