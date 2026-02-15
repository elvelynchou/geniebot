import os
import logging
import warnings

# Suppress noisy startup warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)

import redis
import numpy as np
from sentence_transformers import SentenceTransformer
import json

class VectorStore:
    def __init__(self, host='localhost', port=6379, db=1, prefix='genie:mem:'):
        self.prefix = prefix
        self.redis_client = redis.Redis(host=host, port=port, db=db)
        # Initialize model silently
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Memory Core Loaded.")

    def ingest(self, text, source_id):
        vector = self.model.encode(text)
        vector_bytes = vector.tobytes()
        
        key = f"{self.prefix}{source_id}"
        self.redis_client.hset(key, mapping={
            "text": text,
            "vector": vector_bytes
        })

    def search(self, query, top_k=3):
        query_vector = self.model.encode(query)
        keys = self.redis_client.keys(f"{self.prefix}*")
        
        results = []
        for key in keys:
            data = self.redis_client.hgetall(key)
            if b"text" in data and b"vector" in data:
                stored_text = data[b"text"].decode('utf-8')
                stored_vector_bytes = data[b"vector"]
                stored_vector = np.frombuffer(stored_vector_bytes, dtype=np.float32)
                
                norm_q = np.linalg.norm(query_vector)
                norm_s = np.linalg.norm(stored_vector)
                
                if norm_q > 0 and norm_s > 0:
                    similarity = np.dot(query_vector, stored_vector) / (norm_q * norm_s)
                    results.append((stored_text, similarity))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return [res[0] for res in results[:top_k]]

if __name__ == "__main__":
    store = VectorStore()