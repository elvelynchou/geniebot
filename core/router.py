import numpy as np
from sentence_transformers import SentenceTransformer

class GenieRouter:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(GenieRouter, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized: return
        
        print("[*] Initializing Genie Precision Router (V2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # CORE KEYWORDS ONLY - Reduce semantic overlap
        self.route_data = {
            "imggen": ["draw picture", "generate image", "pixar render", "画图", "生图", "画一张"],
            "socialpub": ["post to x", "tweet", "publish to twitter", "发布到X", "发推", "发个动态"],
            "sys_check": ["check system", "system status", "health check", "系统状态", "检查状态", "运行情况"],
            "reader_agent": ["scrape website", "read content", "scan url", "抓取网页", "阅读内容", "提取文本"],
            "artifact_retrieval": ["send me the image", "find my last picture", "show me the file", "回复刚才的图", "把图发给我", "查看生成的作品"]
        }
        
        self.reference_embeddings = {}
        for name, texts in self.route_data.items():
            self.reference_embeddings[name] = self.model.encode(texts)
            
        self._initialized = True
        print("[✓] Genie Precision Router Ready.")

    def guide(self, text):
        try:
            # 1. Exact match quick-route
            if "画" in text or "生图" in text: return "imggen"
            if "发布" in text or "推特" in text or "发个推" in text: return "socialpub"
            if "状态" in text or "目录" in text or "存活" in text: return "sys_check"
            if "找" in text or "发给我" in text or "图片" in text: return "artifact_retrieval"
            
            # 2. Semantic fallback
            query_vec = self.model.encode([text])[0]
            best_route = None
            max_score = 0
            
            for name, embs in self.reference_embeddings.items():
                dots = np.dot(embs, query_vec)
                norms = np.linalg.norm(embs, axis=1) * np.linalg.norm(query_vec)
                sims = dots / (norms + 1e-8)
                score = np.max(sims)
                if score > max_score:
                    max_score = score
                    best_route = name
            
            if max_score > 0.5:
                return best_route
        except Exception: pass
        return None

if __name__ == "__main__":
    router = GenieRouter()
    print(router.guide("帮我画个机器猫"))
