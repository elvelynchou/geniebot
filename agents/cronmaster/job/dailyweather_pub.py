import os
import json
import subprocess
import re
import sys
import time

# Configuration
PROJECT_ROOT = "/etc/myapp/geniebot"
PROMPT_TEMPLATE_PATH = os.path.join(PROJECT_ROOT, "agents/cronmaster/job/dailyweather_prompt.txt")
IMGGEN_PATH = os.path.join(PROJECT_ROOT, "agents/imggen/venv/bin/python3")
IMGGEN_SRC = os.path.join(PROJECT_ROOT, "agents/imggen/src/generate.py")
SOCIALPUB_PATH = os.path.join(PROJECT_ROOT, "agents/socialpub/venv/bin/python3")
SOCIALPUB_SRC = os.path.join(PROJECT_ROOT, "agents/socialpub/src/publish.py")

def get_yolo_weather_report():
    """Asks Gemini (YOLO) to generate the entire weather scenario."""
    query = (
        "Act as a creative director for a weather broadcast. "
        "Pick a random interesting city in the world. "
        "Provide: city name, a specific weather condition, a realistic temperature, "
        "a highly detailed and stylish outfit description for a female forecaster appropriate for that weather, "
        "and a vivid visual description of how the weather elements (clouds, light, rain, etc.) interact with the city's landmarks. "
        "Return ONLY a JSON object with keys: 'city', 'weather', 'temp', 'outfit', 'atmosphere'."
    )
    
    try:
        print("[*] Consulting Gemini (YOLO) for a creative weather scenario...")
        cmd = ["gemini", "--yolo", query]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        # Extract JSON from response
        match = re.search(r"\{.*\}", result.stdout, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            # Basic validation
            required = ['city', 'weather', 'temp', 'outfit', 'atmosphere']
            if all(k in data for k in required):
                return data
            else:
                raise ValueError(f"Missing keys in AI response: {data.keys()}")
    except Exception as e:
        print(f"[-] YOLO Consultation failed: {e}")
    
    # Absolute Fallback if YOLO fails
    return {
        "city": "Reykjavík",
        "weather": "Northern Lights & Frost",
        "temp": "-2°C",
        "outfit": "a thick silver techwear parka with a faux-fur hood and glowing accents",
        "atmosphere": "shimmering aurora borealis dancing over the basalt-inspired architecture, with light frost dusting the streets"
    }

def main():
    # 1. Get Scenario from AI
    data = get_yolo_weather_report()
    city = data["city"]
    weather = data["weather"]
    temp = data["temp"]

    print(f"[+] AI Choice: {city} | {weather} | {temp}")

    # 2. Read and Fill Template
    if not os.path.exists(PROMPT_TEMPLATE_PATH):
        print(f"[-] Error: Template not found at {PROMPT_TEMPLATE_PATH}")
        sys.exit(1)

    with open(PROMPT_TEMPLATE_PATH, "r") as f:
        template = f.read()
    
    try:
        final_prompt = template.format(
            CITY=city,
            TEMP=temp,
            WEATHER=weather,
            OUTFIT=data["outfit"],
            ATMOSPHERE=data["atmosphere"]
        )
    except KeyError as e:
        print(f"[-] Template formatting error: Missing key {e}")
        sys.exit(1)

    print("-" * 30)
    print(f"FULL PROMPT:\n{final_prompt}")
    print("-" * 30)

    # 3. Generate Image
    print(f"[*] Calling imggen with prompt for {city}...")
    img_cmd = [IMGGEN_PATH, IMGGEN_SRC, "--prompt", final_prompt]
    img_result = subprocess.run(img_cmd, capture_output=True, text=True)
    
    img_path = None
    if "IMAGE_GENERATED:" in img_result.stdout:
        img_path = img_result.stdout.split("IMAGE_GENERATED:")[1].strip()
        print(f"[+] Image generated: {img_path}")
    else:
        print(f"[-] Image generation failed: {img_result.stderr}")
        sys.exit(1)

    # 4. Publish to X
    status_text = f"Weather in {city}: {weather} ({temp})"
    pub_cmd = [
        SOCIALPUB_PATH, SOCIALPUB_SRC, 
        "--text", status_text, 
        "--image", img_path,
        "--profile", "lab_generator"
    ]
    
    print(f"[*] Publishing to X...")
    pub_result = subprocess.run(pub_cmd, capture_output=True, text=True)
    
    if "SUCCESS" in pub_result.stdout:
        print(f"[++++] Success! Weather report for {city} is now live.")
    else:
        print(f"[-] Publication failed: {pub_result.stderr}")

if __name__ == "__main__":
    main()
