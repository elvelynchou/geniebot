import json
import os

class SessionManager:
    def __init__(self, registry_path="logs/sessions/registry.json"):
        self.registry_path = registry_path
        self._ensure_registry_exists()

    def _ensure_registry_exists(self):
        directory = os.path.dirname(self.registry_path)
        if not os.path.exists(directory):
            os.makedirs(directory)
        if not os.path.exists(self.registry_path):
            with open(self.registry_path, "w") as f:
                json.dump({}, f)

    def detect_intent(self, text):
        keywords = ["continue", "then"]
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in keywords):
            return "RESUME"
        return "YOLO"

    def get_registry(self):
        with open(self.registry_path, "r") as f:
            return json.load(f)

    def update_registry(self, data):
        registry = self.get_registry()
        registry.update(data)
        with open(self.registry_path, "w") as f:
            json.dump(registry, f, indent=4)
