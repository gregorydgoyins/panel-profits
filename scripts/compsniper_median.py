#!/usr/bin/env python3
"""Print the CompSniper median sold price and sample size for a keyword.

Usage: COMPSNIPER_API_KEY=... python3 scripts/compsniper_median.py "nintendo switch oled"
The key is read from the environment only; it is never printed.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.compsniper.com"
MAX_RETRIES = 3


def get(path: str, params: dict) -> dict:
    key = os.environ.get("COMPSNIPER_API_KEY")
    if not key:
        sys.exit("COMPSNIPER_API_KEY is not set")
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    for attempt in range(MAX_RETRIES + 1):
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code in (429, 503) and attempt < MAX_RETRIES:
                wait = int(e.headers.get("Retry-After") or 5)
                time.sleep(wait)
                continue
            # 400, quota_exceeded, 401, etc. are not retried.
            sys.exit(f"HTTP {e.code}: {body[:300]}")
    sys.exit("Gave up after retries")


def main() -> None:
    keyword = sys.argv[1] if len(sys.argv) > 1 else "nintendo switch oled"
    data = get("/v1/scrape", {"keyword": keyword, "sold": "true", "ebaySite": "ebay.com"})
    s = data.get("summary") or {}
    print(f"keyword:     {keyword}")
    print(f"median sold: {s.get('median')} {s.get('currency', '')}")
    print(f"sample size: {s.get('count')}")


if __name__ == "__main__":
    main()
