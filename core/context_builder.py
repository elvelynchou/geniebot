import os
from core.vector_store import VectorStore

class ContextBuilder:
    def __init__(self, root_dir=None):
        self.root_dir = root_dir or os.getcwd()
        # 1. Initialize VectorStore
        self.vector_store = VectorStore()

    def build_context(self, user_input, intent="YOLO"):
        # 2. Keep SOUL.md: Always read fully (Identity is critical)
        soul_path = os.path.join(self.root_dir, "SOUL.md")
        soul_content = ""
        if os.path.exists(soul_path):
            with open(soul_path, "r") as f:
                soul_content = f.read()

        # 3. Replace GEMINI.md reading with RAG
        # Instead of reading the whole file, we search for relevant knowledge
        relevant_chunks = self.vector_store.search(user_input, top_k=3)
        rag_content = "\n".join(relevant_chunks)

        # 4. Preserve CWD Injection: environmental awareness
        cwd = os.getcwd()
        agents_dir = os.path.join(self.root_dir, "agents")
        agents_list = os.listdir(agents_dir) if os.path.exists(agents_dir) else []

        # Constructing the context
        context = f"{soul_content}\n\n"
        
        context += "--- RELEVANT KNOWLEDGE (RAG) ---\n"
        if rag_content:
            context += f"{rag_content}\n"
        else:
            context += "No specific relevant rules found.\n"
        context += "--------------------------------\n\n"

        context += f"Physical Location: {cwd}\n"
        context += f"Available Agents: {', '.join(agents_list)}\n"

        # 5. Preserve Mode Logic: intent handling
        if intent == "RESUME":
            context += "\n[MODE: RESUME]"
            
        # 6. System Hints
        context += "\n\n--- PROTOCOL ---\n"
        context += "To take action, use: EXECUTE_AGENT: <agent_name> <args>\n"
        context += "Example: EXECUTE_AGENT: imggen --prompt \"a golden cat\"\n"
        context += "DO NOT explain what you will do. JUST output the protocol line if an action is required.\n"
        context += "----------------\n"
            
        return context.strip()
