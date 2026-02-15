import re

class CodeMapper:
    """
    Implements cgrep-style logic to extract a structured 'map' of code and content.
    Optimized for token efficiency and structural clarity.
    """
    
    @staticmethod
    def map_markdown(content):
        if not content:
            return ""
        
        lines = content.split('\n')
        mapped_lines = []
        in_code_block = False
        
        # Broader regex to catch more definitions and structural keywords
        code_regex = re.compile(
            r'^\s*(def\s+\w+|class\s+\w+|function\s+\w+|async\s+function|export\s+(const|function|class|type|interface)|func\s+.*\{|interface\s+\w+|type\s+\w+|public\s+|private\s+|protected\s+)', 
            re.IGNORECASE
        )

        for line in lines:
            stripped = line.strip()
            
            # Code block detection
            if stripped.startswith('```'):
                in_code_block = not in_code_block
                mapped_lines.append(line)
                continue
            
            if in_code_block:
                # Inside code: keep structure and imports
                if code_regex.search(line) or 'import ' in line or 'from ' in line:
                    mapped_lines.append(line)
                elif stripped == "":
                    if mapped_lines and mapped_lines[-1] != "":
                        mapped_lines.append("")
            else:
                # Outside code: 
                # Keep Headers, Lists, and lines that look like code signatures (some scrapers don't use ```)
                if line.startswith('#') or stripped.startswith(('-', '*', '1.')) or code_regex.search(line):
                    mapped_lines.append(line)
                elif stripped == "":
                    if mapped_lines and mapped_lines[-1] != "":
                        mapped_lines.append("")
        
        # Final cleanup: remove trailing/leading empty lines
        return '\n'.join(mapped_lines).strip()
