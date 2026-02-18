import os
from core.vector_store import VectorStore

class ContextBuilder:
    _vector_store = None # Class-level singleton

    def __init__(self, root_dir=None):
        self.root_dir = root_dir or os.getcwd()
        # Ensure VectorStore is only initialized ONCE across the whole process
        if ContextBuilder._vector_store is None:
            print("[*] Waking up Memory Core (RAG)...")
            ContextBuilder._vector_store = VectorStore()
            print("[✓] Memory Core Ready.")
        self.vector_store = ContextBuilder._vector_store

    def build_context(self, user_input, intent="YOLO"):
        soul_path = os.path.join(self.root_dir, "SOUL.md")
        soul_content = ""
        if os.path.exists(soul_path):
            with open(soul_path, "r") as f:
                soul_content = f.read()

        # RAG Search
        rag_content = ""
        try:
            relevant_chunks = self.vector_store.search(user_input, top_k=3)
            rag_content = "\n".join(relevant_chunks)
        except Exception as e:
            print(f"[!] RAG Search skipped: {e}")

        cwd = os.getcwd()
        context = f"{soul_content}\n\n"
        context += "--- RELEVANT KNOWLEDGE (RAG) ---\n"
        context += rag_content if rag_content else "No specific context retrieved."
        context += "\n--------------------------------\n\n"
        
        context += f"Physical Location: {cwd}\n"
        context += "Available Agents: imggen, socialpub, reader_agent, vault, evolver, sys_check\n"
            
        context += "\n\n--- PROTOCOL ---\n"
        context += "To take action, use: EXECUTE_AGENT: <agent_name> --args\n"
        context += "----------------\n"
            
        return context.strip()
