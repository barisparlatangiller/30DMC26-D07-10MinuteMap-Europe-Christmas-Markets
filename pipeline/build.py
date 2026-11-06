"""
Christmas Is Loading… — Europe's Christmas markets from OpenStreetMap (xmas:feature=market), on a 2026 calendar.

xmas:day_date is free text in many formats and often from an earlier year. Each market gets:
  status  "2026"      dates tagged for 2026 in OSM
          "recurring" a yearless range ("Nov 20-Dec 24", "dec 01-24") applied to 2026
          "past"      only an earlier year is tagged; that year's day and month are shown as an estimate for 2026
          "unknown"   no usable date (shown on the map, not on the calendar)
None of the dates is checked against the organisers; the map says so.

  python pipeline/build.py   → docs/data/markets.geojson, docs/data/stats.json
"""
import json, re
from datetime import date
from pathlib import Path

import geopandas as gpd

SRC = Path("data/xmas_markets_europe_osm.gpkg"); OUT = Path("docs/data")
MON = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
MON.update({"dez": 12, "okt": 10, "mär": 3, "mai": 5, "déc": 12, "nov.": 11, "dec.": 12, "listopad": 11, "prosinec": 12, "grudzień": 12, "december": 12, "november": 11, "january": 1, "januar": 1})


def y26(m, d, start=True):
    """day/month on the 2026 season: Jan dates belong to 2027"""
    return date(2027 if m < 6 else 2026, m, d)


def parse(s):
    if not isinstance(s, str) or not s.strip():
        return None
    t = s.strip().lower().replace("–", "-").replace("—", "-").replace(" to ", "-").replace(" bis ", "-").replace("bis", "-")
    t = re.sub(r"(\d{4})\.(\d{1,2})\.(\d{1,2})", r"\1-\2-\3", t)                      # 2019.12.11 → ISO
    t = re.sub(r"(\d{1,2})/(\d{1,2})/(\d{4})", r"\1.\2.\3", t)                         # 16/11/2014 → dotted
    t = re.sub(r"(\d{1,2}\.\d{1,2}\.\d{4})\s*/\s*(\d{1,2}\.\d{1,2}\.\d{4})", r"\1-\2", t)
    # "2023 nov 24 - 2023 dec 22" (opening_hours style)
    m = re.search(r"(\d{4}) ([a-z]{3}) (\d{1,2})\s*-\s*(?:(\d{4}) )?([a-z]{3}) (\d{1,2})", t)
    if m and m.group(2) in MON and m.group(5) in MON:
        y1 = int(m.group(1)); y2 = int(m.group(4) or y1)
        return (y1, MON[m.group(2)], int(m.group(3)), y2, MON[m.group(5)], int(m.group(6)))
    # "04.-06.12.2026"
    m = re.search(r"(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m and not re.search(r"\d\.\d{1,2}\.?\s*-", t):
        d1, d2, m2, y = map(int, m.groups()); return (y, m2, d1, y, m2, d2)
    # ISO range 2025-11-24/2025-12-22 or 2025-11-24-2025-12-22
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})\s*[/-]\s*(\d{4})-(\d{1,2})-(\d{1,2})", t)
    if m:
        y1, m1, d1, y2, m2, d2 = map(int, m.groups()); return (y1, m1, d1, y2, m2, d2)
    # 28.11.2025-24.12.2025
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m:
        d1, m1, y1, d2, m2, y2 = map(int, m.groups()); return (y1, m1, d1, y2, m2, d2)
    # 28.11.-24.12.2025 / 28.11-24.12.2025
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m:
        d1, m1, d2, m2, y2 = map(int, m.groups()); return (y2 - (1 if m1 > m2 else 0), m1, d1, y2, m2, d2)
    # single day: 2018-12-09 / 01.12.2013
    m = re.fullmatch(r"\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*", t) or None
    if m:
        y, mo, d = map(int, m.groups()); return (y, mo, d, y, mo, d)
    m = re.fullmatch(r"\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*", t)
    if m:
        d, mo, y = map(int, m.groups()); return (y, mo, d, y, mo, d)
    # yearless: "nov 20-dec 24", "dec 01-24", "nov 15-jan 1"
    m = re.search(r"([a-zäé]{3,9})\.?\s*(\d{1,2})\s*-\s*(?:([a-zäé]{3,9})\.?\s*)?(\d{1,2})", t)
    if m and m.group(1)[:3] in MON:
        a, d1, b, d2 = m.groups(); m1 = MON[a[:3]]; m2 = MON[b[:3]] if b and b[:3] in MON else m1
        return (None, m1, int(d1), None, m2, int(d2))
    # "20.11.-24.12." yearless dotted
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.?", t)
    if m:
        d1, m1, d2, m2 = map(int, m.groups()); return (None, m1, d1, None, m2, d2)
    return None


def main():
    g = gpd.read_file(SRC).to_crs(4326)
    feats, cnt = [], {"2026": 0, "recurring": 0, "past": 0, "unknown": 0}
    years = {}
    for _, r in g.iterrows():
        p = {k: (v if not (isinstance(v, float) and v != v) else None) for k, v in r.items()}
        raw = p.get("xmas:day_date") or p.get("xmas:date_day") or p.get("xmas:day-date")
        status, o, c, yr = "unknown", None, None, None
        try:
            v = parse(raw)
            if v:
                y1, m1, d1, y2, m2, d2 = v
                if y1 == 2026 or y2 == 2026 or (y1 == 2026 - 1 and y2 == 2026 and m1 >= 10):
                    status = "2026"; o = date(y1, m1, d1); c = date(y2, m2, d2)
                elif y1 is None:
                    status = "recurring"; o = y26(m1, d1); c = y26(m2, d2)
                elif y1 and 2000 <= y1 < 2026:
                    status = "past"; yr = y1; o = y26(m1, d1); c = y26(m2, d2)
                if o and c and (c < o or (c - o).days > 120 or o < date(2026, 10, 1)):
                    status, o, c = "unknown", None, None
        except ValueError:
            status, o, c = "unknown", None, None
        cnt[status] += 1
        if yr: years[yr] = years.get(yr, 0) + 1
        name = p.get("xmas:name") or p.get("name") or "Christmas market"
        url = p.get("xmas:url") or p.get("website") or p.get("xmas:website")
        pr = {"n": name, "s": status, "raw": raw if isinstance(raw, str) else None}
        if o: pr["o"] = o.isoformat(); pr["c"] = c.isoformat()
        if yr: pr["y"] = yr
        if isinstance(url, str) and url.startswith("http"): pr["u"] = url
        for k, kk in (("xmas:opening_hours", "h"), ("xmas:location", "loc"), ("xmas:fee", "fee"), ("addr:city", "city")):
            if isinstance(p.get(k), str): pr[kk] = p[k]
        pr["id"] = p.get("@id") or p.get("id")
        feats.append({"type": "Feature", "properties": pr,
                      "geometry": {"type": "Point", "coordinates": [round(r.geometry.x, 5), round(r.geometry.y, 5)]}})
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "markets.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
    dated = [f["properties"] for f in feats if "o" in f["properties"]]
    by_open = {}
    for p in dated: by_open[p["o"]] = by_open.get(p["o"], 0) + 1
    first = min(dated, key=lambda p: p["o"]); peak = max(by_open.items(), key=lambda x: x[1])
    st = {"markets": len(feats), "status": cnt, "past_years": dict(sorted(years.items())), "openings_by_day": dict(sorted(by_open.items())),
          "busiest_opening": peak, "source": "OpenStreetMap contributors (ODbL), Overpass export, xmas:feature=market"}
    (OUT / "stats.json").write_text(json.dumps(st, ensure_ascii=False, indent=1))
    print(json.dumps({k: st[k] for k in ("markets", "status", "past_years", "busiest_opening")}))


if __name__ == "__main__":
    main()
