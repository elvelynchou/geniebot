import subprocess
import os
import sys

def launch_native_chrome(profile_name):
    profile_path = f"/etc/myapp/orcher/stealth_browser/profiles/{profile_name}"
    os.makedirs(profile_path, exist_ok=True)
    
    # Using the most native command possible
    cmd = [
        "/bin/google-chrome",
        f"--user-data-dir={profile_path}",
        "--no-first-run",
        "--disable-blink-features=AutomationControlled",
        "https://dexscreener.com/solana"
    ]
    
    print(f"[*] Launching NATIVE Chrome for profile: {profile_name}")
    print("[*] Please complete Cloudflare verification in the window.")
    print("[*] Once you see the trades, close the browser window manually.")
    
    try:
        subprocess.run(cmd)
        print("[+] Native session closed. Credential should be saved.")
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    profile = sys.argv[1] if len(sys.argv) > 1 else "eurydicezhou"
    launch_native_chrome(profile)
