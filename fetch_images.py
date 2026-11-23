import os
import requests

os.makedirs("images", exist_ok=True)

HEADERS = {
    "User-Agent": "PanelProfitsTextbookBuilder/1.0 (contact@panelprofits.com)"
}

# Wikimedia Commons API search queries for public-domain/fair-use archival covers & creator portraits
PLATES = {
    "fig01_action_comics_1.jpg": "Action Comics 1",
    "fig02_siegel_shuster_cleveland.jpg": "Jerry Siegel Joe Shuster",
    "fig03_captain_america_1.jpg": "Captain America Comics 1",
    "fig04_sub_mariner_wwii.jpg": "Sub-Mariner Comics Timely",
    "fig05_kirby_ditko_portraits.jpg": "Jack Kirby",
    "fig06_amazing_fantasy_15.jpg": "Amazing Fantasy 15",
    "fig07_matt_baker_phantom_lady_17.jpg": "Phantom Lady 17 Matt Baker",
    "fig08_30_days_of_night_1.jpg": "30 Days of Night",
    "fig09_crime_suspenstories_22.jpg": "Crime SuspenStories 22",
}

def fetch_wikimedia_image(query, filename):
    url = "https://wikimedia.org"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": 6,
        "gsrlimit": 1,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json"
    }
    try:
        r = requests.get(url, params=params, headers=HEADERS, timeout=15).json()
        pages = r.get("query", {}).get("pages", {})
        for page in pages.values():
            img_url = page["imageinfo"][0]["url"]
            img_data = requests.get(img_url, headers=HEADERS, timeout=20).content
            out_path = os.path.join("images", filename)
            with open(out_path, "wb") as f:
                f.write(img_data)
            print(f"[OK] Saved {filename} <- {img_url}")
            return True
    except Exception as e:
        print(f"[WARN] Could not auto-fetch {filename}: {e}")
    print(f"[MANUAL] Drop your scan for {filename} into images/{filename}")
    return False

if __name__ == "__main__":
    print("Fetching archival plates into ./images/ ...")
    for fname, q in PLATES.items():
        fetch_wikimedia_image(q, fname)
    print("\nDone! Inspect the ./images/ folder and replace any missing/wrong covers with your own scans.")

