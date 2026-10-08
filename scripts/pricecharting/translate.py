#!/usr/bin/env python3
"""Translate a PriceCharting comics price-guide CSV into the columns Panel Profits stores.
Usage: translate.py guide.csv out.csv
Column mapping (verified against the live PriceCharting page and PRICECHARTING_COMICS_MERGED_37_FIELDS_TRANSLATED.csv):
  loose=RAW  cib=4.0  new=6.0  graded=8.0  box-only=9.2  manual-only=9.8  bgs-10=10.0
  condition-9=2.0  condition-13=3.0  condition-14=5.0  condition-15=7.0  condition-16=9.0
  condition-10=9.6  condition-17=9.4  condition-18=9.8 dealer sell
  retail-loose=RAW buy/sell  retail-cib=4.0 buy/sell  retail-new=6.0 buy/sell
Exits non-zero (loads nothing) if the header differs or the file is implausibly small."""
import csv, sys

EXPECTED = ["id","console-name","product-name","loose-price","cib-price","new-price","graded-price","box-only-price",
 "manual-only-price","bgs-10-price","condition-9-price","condition-10-price","condition-13-price","condition-14-price",
 "condition-15-price","condition-16-price","condition-17-price","condition-18-price","condition-19-price","condition-20-price",
 "condition-21-price","condition-22-price","gamestop-price","gamestop-trade-price","retail-loose-buy","retail-loose-sell",
 "retail-cib-buy","retail-cib-sell","retail-new-buy","retail-new-sell","upc","sales-volume","genre","tcg-id","asin","epid","release-date"]
OUT = [("pp_price_raw","loose-price"),("pp_price_2_0","condition-9-price"),("pp_price_3_0","condition-13-price"),
 ("pp_price_4_0","cib-price"),("pp_price_5_0","condition-14-price"),("pp_price_6_0","new-price"),
 ("pp_price_7_0","condition-15-price"),("pp_price_8_0","graded-price"),("pp_price_9_0","condition-16-price"),
 ("pp_price_9_2","box-only-price"),("pp_price_9_4","condition-17-price"),("pp_price_9_6","condition-10-price"),
 ("pp_price_9_8","manual-only-price"),("pp_price_9_8_sell","condition-18-price"),("pp_price_10_0","bgs-10-price"),
 ("pp_retail_raw_buy","retail-loose-buy"),("pp_retail_raw_sell","retail-loose-sell"),
 ("pp_retail_4_0_buy","retail-cib-buy"),("pp_retail_4_0_sell","retail-cib-sell"),
 ("pp_retail_6_0_buy","retail-new-buy"),("pp_retail_6_0_sell","retail-new-sell")]
MIN_ROWS = 300000

def money(v):
    v = (v or "").strip().replace("$", "").replace(",", "")
    if not v: return ""
    float(v)
    return v

def main(src, dst):
    n = 0
    with open(src, newline="", encoding="utf-8-sig") as f, open(dst, "w", newline="") as o:
        rd = csv.DictReader(f)
        if rd.fieldnames != EXPECTED:
            sys.exit("ABORT: header differs from the 37-column PriceCharting layout: %r" % (rd.fieldnames,))
        w = csv.writer(o)
        w.writerow(["pp_id", "pp_sales_volume"] + [c for c, _ in OUT])
        seen = set()
        for r in rd:
            pid = (r["id"] or "").strip()
            if not pid or pid in seen: continue
            seen.add(pid)
            sv = (r["sales-volume"] or "").strip()
            try: sv = str(int(float(sv))) if sv else ""
            except ValueError: sv = ""
            w.writerow([pid, sv] + [money(r[k]) for _, k in OUT])
            n += 1
    if n < MIN_ROWS:
        sys.exit("ABORT: only %d rows (expected >= %d) - file looks truncated or is not the full guide" % (n, MIN_ROWS))
    print("translated rows:", n)

main(sys.argv[1], sys.argv[2])
