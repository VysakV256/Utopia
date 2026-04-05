import os
import sys
import time
import json
import requests

# Set your App Key as an environment variable or edit here
API_KEY = os.environ.get("SHADERTOY_API_KEY", "YOUR_API_KEY_HERE")
BASE_URL = "https://www.shadertoy.com/api/v1"

def get_all_shader_ids():
    url = f"{BASE_URL}/shaders?key={API_KEY}"
    print(f"Fetching all accessible shader IDs from {url}...")
    resp = requests.get(url)
    if resp.status_code != 200:
        print("Failed to fetch shader IDs. API responded with:", resp.status_code, resp.text)
        return []
    
    data = resp.json()
    if "Results" in data:
        return data["Results"]
    return []

def scrape_shadertoy():
    if API_KEY == "YOUR_API_KEY_HERE":
        print("Please set your SHADERTOY_API_KEY environment variable. You can get an API key from your Shadertoy account settings.")
        sys.exit(1)

    ids = get_all_shader_ids()
    print(f"Found {len(ids)} shaders. Starting download...")
    
    output_file = "shadertoy_data.jsonl"
    
    # Initialize/clear file
    with open(output_file, "w") as f:
        pass 

    for i, sid in enumerate(ids):
        url = f"{BASE_URL}/shaders/{sid}?key={API_KEY}"
        try:
            resp = requests.get(url)
            if resp.status_code == 200:
                data = resp.json()
                shader = data.get("Shader", {})
                info = shader.get("info", {})
                
                title = info.get("name", "Unknown")
                author = info.get("username", "Unknown")
                date = info.get("date", "Unknown")
                
                # Extract code from all passes
                passes = shader.get("renderpass", [])
                code = "\n".join([p.get("code", "") for p in passes])
                
                record = {
                    "id": sid,
                    "title": title,
                    "author": author,
                    "date": date,
                    "code": code
                }
                
                # Save out to JSON lines so we don't lose data if it crashes
                with open(output_file, "a") as f:
                    f.write(json.dumps(record) + "\n")
                
                print(f"[{i+1}/{len(ids)}] Saved: {title} by {author}")
            else:
                print(f"[{i+1}/{len(ids)}] API returned {resp.status_code} for {sid}")
        except Exception as e:
            print(f"[{i+1}/{len(ids)}] Exception for {sid}: {e}")
            
        time.sleep(0.5) # Throttle to be nice to Shadertoy servers

    print(f"Finished! Data saved to {output_file}")

if __name__ == "__main__":
    scrape_shadertoy()
