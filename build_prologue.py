import os
import time
import requests
from weasyprint import HTML

# ==============================================================================
# CONFIGURATION
# ==============================================================================
COMIC_VINE_API_KEY = os.environ.get("COMIC_VINE_API_KEY", "YOUR_COMIC_VINE_API_KEY_HERE")
IMAGE_DIR = "images"
OUTPUT_HTML = "prologue_illustrated.html"
OUTPUT_PDF = "Panel_Profits_Prologue_Final.pdf"

HEADERS = {
    "User-Agent": "PanelProfitsTextbookBuilder/1.0 (Academic Research; contact@panelprofits.com)"
}

os.makedirs(IMAGE_DIR, exist_ok=True)

# ==============================================================================
# 1. IMAGE FETCHERS (WIKIMEDIA COMMONS & COMIC VINE)
# ==============================================================================
def fetch_wikimedia_image(search_query: str, dest_filename: str) -> bool:
    """Searches Wikimedia Commons for an archival photo or public-domain cover."""
    url = "https://wikimedia.org"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {search_query}",
        "gsrnamespace": 6,  # File namespace
        "gsrlimit": 5,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "format": "json",
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for _, page in sorted(pages.items(), key=lambda x: x[1].get("index", 99)):
            imageinfo = page.get("imageinfo", [])
            if not imageinfo:
                continue
            img_url = imageinfo[0].get("url", "")
            if img_url.lower().endswith((".jpg", ".jpeg", ".png")):
                img_data = requests.get(img_url, headers=HEADERS, timeout=20).content
                with open(os.path.join(IMAGE_DIR, dest_filename), "wb") as f:
                    f.write(img_data)
                print(f"[OK - Wikimedia] Saved {dest_filename} <- {page.get('title')}")
                return True
    except Exception as e:
        print(f"[WARN - Wikimedia] Failed for '{search_query}': {e}")
    return False


def fetch_comicvine_cover(volume_query: str, issue_number: str, dest_filename: str) -> bool:
    """Searches Comic Vine API for an exact series + issue number cover."""
    if not COMIC_VINE_API_KEY or COMIC_VINE_API_KEY == "YOUR_COMIC_VINE_API_KEY_HERE":
        print(f"[SKIP - ComicVine] No API key set for {dest_filename}")
        return False

    search_url = "https://gamespot.com"
    params = {
        "api_key": COMIC_VINE_API_KEY,
        "format": "json",
        "resources": "issue",
        "query": f"{volume_query} {issue_number}",
        "limit": 10,
    }
    try:
        resp = requests.get(search_url, params=params, headers=HEADERS, timeout=15)
        results = resp.json().get("results", [])
        for item in results:
            vol_name = item.get("volume", {}).get("name", "").lower()
            iss_num = str(item.get("issue_number", "")).strip()
            if volume_query.lower() in vol_name and iss_num == str(issue_number):
                img_url = item.get("image", {}).get("super_url") or item.get("image", {}).get("original_url")
                if img_url:
                    img_data = requests.get(img_url, headers=HEADERS, timeout=20).content
                    with open(os.path.join(IMAGE_DIR, dest_filename), "wb") as f:
                        f.write(img_data)
                    print(f"[OK - ComicVine] Saved {dest_filename} <- {vol_name.title()} #{iss_num}")
                    return True
    except Exception as e:
        print(f"[WARN - ComicVine] Failed for '{volume_query} #{issue_number}': {e}")
    return False


def download_all_assets():
    print("Fetching archival plates and comic covers...")
    
    # Plate 0.1: Action Comics #1 (1938)
    if not fetch_wikimedia_image("Action Comics 1 1938 cover", "fig01_action_comics_1.jpg"):
        fetch_comicvine_cover("Action Comics", "1", "fig01_action_comics_1.jpg")
    time.sleep(0.5)

    # Plate 0.2: Jerry Siegel & Joe Shuster
    fetch_wikimedia_image("Jerry Siegel Joe Shuster", "fig02_siegel_shuster_cleveland.jpg")
    time.sleep(0.5)

    # Plate 0.3: Captain America Comics #1 (1941)
    if not fetch_wikimedia_image("Captain America Comics 1 1941", "fig03_captain_america_1.jpg"):
        fetch_comicvine_cover("Captain America Comics", "1", "fig03_captain_america_1.jpg")
    time.sleep(0.5)

    # Plate 0.4: Sub-Mariner WWII Cover
    if not fetch_wikimedia_image("Sub-Mariner Comics cover 1941", "fig04_sub_mariner_wwii.jpg"):
        fetch_comicvine_cover("Sub-Mariner Comics", "1", "fig04_sub_mariner_wwii.jpg")
    time.sleep(0.5)

    # Plate 0.5: Jack Kirby Portrait
    fetch_wikimedia_image("Jack Kirby comic", "fig05_kirby_ditko_portraits.jpg")
    time.sleep(0.5)

    # Plate 0.6: Amazing Fantasy #15 (1962)
    if not fetch_comicvine_cover("Amazing Fantasy", "15", "fig06_amazing_fantasy_15.jpg"):
        fetch_wikimedia_image("Amazing Fantasy 15", "fig06_amazing_fantasy_15.jpg")
    time.sleep(0.5)

    # Plate 0.7: Matt Baker / Phantom Lady #17 (1948)
    if not fetch_wikimedia_image("Phantom Lady 17 Matt Baker", "fig07_matt_baker_phantom_lady_17.jpg"):
        fetch_comicvine_cover("Phantom Lady", "17", "fig07_matt_baker_phantom_lady_17.jpg")
    time.sleep(0.5)

    # Plate 0.8: 30 Days of Night #1 (2002)
    fetch_comicvine_cover("30 Days of Night", "1", "fig08_30_days_of_night_1.jpg")
    time.sleep(0.5)

    # Plate 0.9: Crime SuspenStories #22 (1954)
    if not fetch_comicvine_cover("Crime SuspenStories", "22", "fig09_crime_suspenstories_22.jpg"):
        fetch_wikimedia_image("Crime SuspenStories 22", "fig09_crime_suspenstories_22.jpg")


# ==============================================================================
# 2. TEXTBOOK HTML & CSS BUILDER (HIND 300 & STIX TWO MATH)
# ==============================================================================
def render_plate_html(filename: str, plate_num: str, title: str, credits: str, analysis: str, align: str = "right") -> str:
    filepath = os.path.join(IMAGE_DIR, filename)
    float_class = "left" if align == "left" else "right"
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1024:
        media_block = f'<img src="{filepath}" alt="{title}" />'
    else:
        media_block = (
            f'<div class="missing-plate">'
            f'<strong>[Drop Scan Here]</strong><br/><code>images/{filename}</code>'
            f'</div>'
        )
    return f"""
    <figure class="art-plate {float_class}">
      {media_block}
      <figcaption>
        <span class="plate-title">Figure Plate {plate_num}: {title}</span>
        <span class="plate-credits">{credits}</span>
        <span class="plate-analysis"><strong>Visual &amp; Economic Analysis:</strong> {analysis}</span>
      </figcaption>
    </figure>
    """


def build_textbook():
    p01 = render_plate_html(
        "fig01_action_comics_1.jpg", "0.1",
        "<em>Action Comics #1</em> (National Allied Publications, June 1938)",
        "Cover art by Joe Shuster; script by Jerry Siegel. Original price: $0.10. Record realized price: &gt;$15,000,000.",
        "Shuster’s dynamic diagonal composition—a costumed strongman hoisting a green sedan overhead while bystanders flee—was engineered to scream from crowded newsstands. Economically, this image represents the collision between industrial mass production (~200,000 copies) and near-total physical attrition (~98% destruction)."
    )
    p02 = render_plate_html(
        "fig02_siegel_shuster_cleveland.jpg", "0.2",
        "Jerry Siegel &amp; Joe Shuster in Cleveland, Ohio (ca. 1938–1940)",
        "Archival studio photograph of writer Jerry Siegel and artist Joe Shuster.",
        "Working out of a modest Cleveland bedroom without legal counsel, Siegel and Shuster signed away all intellectual property rights to Superman for $130 ($10 per page)—establishing the foundational labor-versus-capital imbalance that governed comics for fifty years.",
        align="left"
    )
    p03 = render_plate_html(
        "fig03_captain_america_1.jpg", "0.3",
        "<em>Captain America Comics #1</em> (Timely Comics, March 1941)",
        "Cover art by Jack Kirby and Joe Simon. Published nine months before Pearl Harbor.",
        "Kirby’s kinetic right cross to Adolf Hitler’s jaw shattered political neutrality while 85% of Americans still opposed entering WWII, turning a ten-cent newsprint periodical into a primary historical document of American anti-fascist mobilization."
    )
    p04 = render_plate_html(
        "fig04_sub_mariner_wwii.jpg", "0.4",
        "<em>Sub-Mariner Comics</em> Wartime Issue (Timely Comics, ca. 1941–1943)",
        "Art and story by Bill Everett / Alex Schomburg wartime cover.",
        "Depicting Prince Namor battling Axis naval forces and Imperial Japanese raiders in the Pacific theater, Golden Age Sub-Mariner covers capture raw wartime mobilization. Because millions of copies were shipped overseas to GIs and never returned, surviving high-grade copies exhibit extreme census scarcity.",
        align="left"
    )
    p05 = render_plate_html(
        "fig05_kirby_ditko_portraits.jpg", "0.5",
        "Jack 'King' Kirby &amp; The Manhattan Bullpen Architects",
        "Archival studio photograph of Jack Kirby at his drawing board.",
        "Between 1961 and 1966, Jack Kirby and Steve Ditko co-created the foundational IP of the Marvel Universe—the Fantastic Four, Spider-Man, the Hulk, Thor, Iron Man, the X-Men, and the Avengers—working under flat page-rate contracts without corporate equity."
    )
    p06 = render_plate_html(
        "fig06_amazing_fantasy_15.jpg", "0.6",
        "<em>Amazing Fantasy #15</em> (Marvel Comics, August 1962)",

