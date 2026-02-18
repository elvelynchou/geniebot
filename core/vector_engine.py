import os
import json
import logging
import numpy as np
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery
from sentence_transformers import SentenceTransformer

# Suppress noisy startup warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

class GenieVectorEngine:
    """
    Enhanced Vector Search Engine with Dynamic Fallback.
    """
    INDEX_NAME = "genie_memory"
    
    def __init__(self, redis_url="redis://localhost:6379/1"):
        self.redis_url = redis_url
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Define Schema
        self.schema = {
            "index": {"name": self.INDEX_NAME, "prefix": "genie:mem:", "storage_type": "hash"},
            "fields": [
                {"name": "text", "type": "text"},
                {"name": "source", "type": "tag"},
                {
                    "name": "vector",
                    "type": "vector",
                    "attrs": {"dims": 384, "distance_metric": "cosine", "algorithm": "hnsw", "datatype": "float32"},
                },
            ],
        }
        
        self.index = SearchIndex.from_dict(self.schema)
        self.index.connect(redis_url)
        
        self.enabled_vsearch = True
        try:
            if not self.index.exists():
                print(f"[*] Creating RedisVL index: {self.INDEX_NAME}")
                self.index.create(overwrite=True)
        except Exception:
            print(f"[*] RedisVL Search not supported. Using Manual Fallback.")
            self.enabled_vsearch = False

    def ingest(self, text, source="manual"):
        vector = self.model.encode(text).astype(np.float32).tolist()
        if self.enabled_vsearch:
            self.index.load([{"text": text, "source": source, "vector": vector}])
        else:
            import uuid
            key = f"genie:mem:{uuid.uuid4().hex}"
            # Use raw redis client for manual storage
            self.index._redis_client.hset(key, mapping={
                "text": text,
                "source": source,
                "vector": np.array(vector, dtype=np.float32).tobytes()
            })

    def search(self, query, top_k=3):
        query_vector = self.model.encode(query).astype(np.float32)
        
        if self.enabled_vsearch:
            v_query = VectorQuery(
                vector=query_vector.tolist(),
                vector_field_name="vector",
                return_fields=["text", "source"],
                num_results=top_k
            )
            return [res['text'] for res in self.index.query(v_query)]
        else:
            r = self.index._redis_client
            # IMPORTANT: Search both bytes and string keys for maximum compatibility
            keys = r.keys("genie:mem:*")
            scored_results = []
            for key in keys:
                data = r.hgetall(key)
                # Normalize data keys (handle both bytes and strings)
                norm_data = {k.decode('utf-8') if isinstance(k, bytes) else k: v for k, v in data.items()}
                
                if "text" in norm_data and "vector" in norm_data:
                    text_val = norm_data["text"]
                    if isinstance(text_val, bytes): text_val = text_val.decode('utf-8')
                    
                    vec_val = norm_data["vector"]
                    stored_vector = np.frombuffer(vec_val, dtype=np.float32)
                    
                    if stored_vector.shape == query_vector.shape:
                        similarity = np.dot(query_vector, stored_vector) / (np.linalg.norm(query_vector) * np.linalg.norm(stored_vector))
                        scored_results.append((text_val, similarity))
            
            scored_results.sort(key=lambda x: x[1], reverse=True)
            return [res[0] for res in scored_results[:top_k]]
