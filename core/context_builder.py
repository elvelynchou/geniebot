import os
from core.vector_engine import GenieVectorEngine

class ContextBuilder:
    _vector_engine = None # Class-level singleton

    def __init__(self, root_dir=None):
        self.root_dir = root_dir or os.getcwd()
        # Ensure VectorEngine is only initialized ONCE
        if ContextBuilder._vector_engine is None:
            print("[*] Waking up Optimized Memory Engine (RedisVL)...")
            ContextBuilder._vector_engine = GenieVectorEngine()
            print("[✓] Memory Engine Ready.")
        self.vector_engine = ContextBuilder._vector_engine

    def build_context(self, user_input, intent="YOLO"):
        soul_path = os.path.join(self.root_dir, "SOUL.md")
        soul_content = ""
        if os.path.exists(soul_path):
            with open(soul_path, "r") as f:
                soul_content = f.read()

        # RAG Search via RedisVL
        rag_content = ""
        try:
            relevant_chunks = self.vector_engine.search(user_input, top_k=3)
            rag_content = "\n".join(relevant_chunks)
        except Exception as e:
            print(f"[!] RAG Search failed (Likely missing RediSearch module): {e}")

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
