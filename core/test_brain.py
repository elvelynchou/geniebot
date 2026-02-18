import sys
import os

PROJECT_ROOT = "/etc/myapp/geniebot"
sys.path.append(PROJECT_ROOT)

from core.router import GenieRouter
from core.vector_engine import GenieVectorEngine

def test_system():
    print("=== Genie Brain Health Check ===")
    
    # 1. Test Semantic Router
    print("\n[1/3] Testing Semantic Router...")
    router = GenieRouter()
    queries = {
        "帮我画一只机器猫": "imggen",
        "把这张图发到推特上": "socialpub",
        "检查一下系统状态": "sys_check",
        "你是谁？": None
    }
    
    for q, expected in queries.items():
        result = router.guide(q)
        status = "PASS" if result == expected else "FAIL"
        print(f"  Query: '{q}' -> Intent: {result} ({status})")

    # 2. Test Vector Engine
    print("\n[2/3] Testing Vector Engine & Model...")
    engine = GenieVectorEngine()
    test_text = "Genie architecture is now stable."
    engine.ingest(test_text, source="test_unit")
    print("  [*] Ingested test memory.")
    
    search_results = engine.search("stable architecture")
    found = any(test_text in str(res) for res in search_results)
    print(f"  RAG Search: {'PASS' if found else 'FAIL'}")

    # 3. Check Redis Mode
    print("\n[3/3] Checking Redis Mode...")
    mode = "High-Performance (RedisVL Native)" if engine.enabled_vsearch else "Compatibility (Manual Fallback)"
    print(f"  Mode: {mode}")

if __name__ == "__main__":
    test_system()
