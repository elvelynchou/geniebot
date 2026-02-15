import os
import yaml
import re

class Sentinel:
    def __init__(self, policy_path="config/safety_policy.yaml"):
        self.policy_path = policy_path
        self.policy = self._load_policy()

    def _load_policy(self):
        try:
            with open(self.policy_path, "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            # Emergency default if config fails
            return {"blocked_commands": ["rm", "mkfs"], "default_action": "block"}

    def vet_command(self, cmd_list):
        """
        Vets a shell command using regex with word boundaries to prevent false positives.
        """
        cmd_str = " ".join(cmd_list).lower()
        
        # 1. Check for explicitly blocked commands using word boundaries
        for blocked in self.policy.get("blocked_commands", []):
            # \b matches word boundaries, preventing 'warm' from matching 'rm'
            pattern = rf"\b{re.escape(blocked)}\b"
            if re.search(pattern, cmd_str):
                return False, f"Sentinel Violation: Command contains blocked keyword '{blocked}'"

        return True, "Safe"

if __name__ == "__main__":
    # Test
    s = Sentinel()
    print(s.vet_command(["ls", "-la"]))
    print(s.vet_command(["rm", "-rf", "/"]))
