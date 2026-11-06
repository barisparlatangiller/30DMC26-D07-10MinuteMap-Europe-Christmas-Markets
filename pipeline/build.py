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
import pandas as pd
import requests

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"

# 2026 dates checked against the organisers or city (6 Nov 2026). OSM id → (open, close, source)
VERIFIED = {
    "node/999972327": ("2026-11-27", "2026-12-24", "https://www.nuernberg.de/internet/stadtportal/christkindlesmarkt.html"),
    "way/29143417": ("2026-11-13", "2026-12-26", "https://www.christkindlmarkt.at/wp-content/uploads/2026/01/01_Wiener-Christkindlmarkt-2026_Information-Standbewerbung.pdf"),
    "node/3206525810": ("2026-11-20", "2026-12-24", "https://stadt.muenchen.de/dam/Home/Stadtverwaltung/Referat-fuer-Arbeit-und-Wirtschaft/presse/pm/PR-Meldungen-ChM/01_Auf-Abbau_Christkindlmarkt_2026.pdf"),
    "node/2555466817": ("2026-11-25", "2026-12-23", "https://www.stuttgart.de/veranstaltungskalender/veranstaltungen/stuttgarter-weihnachtsmarkt-46764"),
    "node/1038311104": ("2026-11-19", "2027-01-01", "https://www.salzburg.info/de/veranstaltungen/veranstaltungskalender/salzburger-christkindlmarkt-am-dom-und-residenzplatz_event_42164409"),
    "node/998717434": ("2026-11-20", "2026-12-23", "https://aachenweihnachtsmarkt.de/en/"),
    "node/3948168083": ("2026-11-23", "2026-12-22", "https://www.heidelberg24.de/heidelberg/heidelberger-weihnachtsmarkt-2026-termine-und-tipps-94539706.html"),
}
VERIFIED_NAME = {"way/29143417": "Wiener Christkindlmarkt am Rathausplatz"}
FIXED_CLOSE = {(12, 22), (12, 23), (12, 24), (12, 30), (12, 31), (1, 1), (1, 6)}


def shift_weekday(o, c, y, m1, d1):
    """estimate from an earlier year: keep the weekday it opened on (nearest 2026 date, ±3 days); a closing day such as
    23 or 24 December stays fixed, any other closing day moves with the opening"""
    try:
        wd = date(y if m1 > 6 else y + 1, m1, d1).weekday() if False else date(y, m1, d1).weekday()
    except ValueError:
        return o, c
    delta = (wd - o.weekday() + 3) % 7 - 3
    from datetime import timedelta
    o2 = o + timedelta(days=delta)
    c2 = c if (c.month, c.day) in FIXED_CLOSE else c + timedelta(days=delta)
    return (o2, c2) if c2 >= o2 else (o, c)


def ne(name, cache):
    f = Path("input") / f"{name}.geojson"
    if not f.exists():
        f.parent.mkdir(exist_ok=True)
        f.write_bytes(requests.get(NE + f"{name}.geojson", timeout=180).content)
    return gpd.read_file(f)

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
    t = t.split("|")[0].split(";")[0].replace("--", "/").replace(" -dec", " dec").replace(" -nov", " nov")
    t = re.sub(r"(\d{4})\.(\d{1,2})\.(\d{1,2})", r"\1-\2-\3", t)                      # 2019.12.11 → ISO
    t = re.sub(r"(\d{1,2})/(\d{1,2})/(\d{4})", r"\1.\2.\3", t)                         # 16/11/2014 → dotted
    t = re.sub(r"(\d{1,2}\.\d{1,2}\.\d{4})\s*/\s*(\d{1,2}\.\d{1,2}\.\d{4})", r"\1-\2", t)
    # "2023 nov 24 - 2023 dec 22" (opening_hours style)
    m = re.search(r"(\d{4}) ([a-z]{3}) (\d{1,2})\s*-\s*(?:(\d{4}) )?([a-z]{3}) (\d{1,2})", t)
    if m and m.group(2) in MON and m.group(5) in MON:
        y1 = int(m.group(1)); y2 = int(m.group(4) or y1)
        return (y1, MON[m.group(2)], int(m.group(3)), y2, MON[m.group(5)], int(m.group(6)))

    # ISO range 2025-11-24/2025-12-22 or 2025-11-24-2025-12-22
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})\s*[/-]\s*(\d{4})-(\d{1,2})-(\d{1,2})", t)
    if m:
        y1, m1, d1, y2, m2, d2 = map(int, m.groups()); return (y1, m1, d1, y2, m2, d2)
    # 28.11.2025-24.12.2025
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m:
        d1, m1, y1, d2, m2, y2 = map(int, m.groups()); return (y1, m1, d1, y2, m2, d2)
    # "04.-06.12.2026" (after the full dotted ranges, so "17.11.2018-23.12.2018" is not misread)
    m = re.search(r"(\d{1,2})\.?\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})", t)
    if m and not re.search(r"\d{1,2}\.\d{1,2}\.?\s*-", t):
        d1, d2, m2, y = map(int, m.groups()); return (y, m2, d1, y, m2, d2)
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
    feats, cnt = [], {"verified": 0, "2026": 0, "recurring": 0, "past": 0, "unknown": 0}
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
                    o, c = shift_weekday(o, c, y1, m1, d1)
                if o and c and (c < o or (c - o).days > 120 or o < date(2026, 10, 1)):
                    status, o, c = "unknown", None, None
        except ValueError:
            status, o, c = "unknown", None, None
        oid = p.get("@id") or p.get("id")
        if oid in VERIFIED:
            vo, vc, vs = VERIFIED[oid]; status = "verified"; o = date.fromisoformat(vo); c = date.fromisoformat(vc)
        cnt[status] = cnt.get(status, 0) + 1
        if yr: years[yr] = years.get(yr, 0) + 1
        name = VERIFIED_NAME.get(oid) or p.get("xmas:name") or p.get("name") or "Christmas market"
        url = p.get("xmas:url") or p.get("website") or p.get("xmas:website")
        pr = {"n": name, "s": status, "raw": raw if isinstance(raw, str) else None}
        if o: pr["o"] = o.isoformat(); pr["c"] = c.isoformat()
        if yr: pr["y"] = yr
        if isinstance(url, str) and url.startswith("http"): pr["u"] = url
        for k, kk in (("xmas:opening_hours", "h"), ("xmas:location", "loc"), ("xmas:fee", "fee"), ("addr:city", "city")):
            if isinstance(p.get(k), str): pr[kk] = p[k]
        pr["id"] = oid
        if oid in VERIFIED: pr["src"] = VERIFIED[oid][2]
        feats.append({"type": "Feature", "properties": pr,
                      "geometry": {"type": "Point", "coordinates": [round(r.geometry.x, 5), round(r.geometry.y, 5)]}})
    # country and nearest town (Natural Earth 1:10m) for every market
    pts = gpd.GeoDataFrame({"i": range(len(feats))}, geometry=gpd.points_from_xy(
        [f["geometry"]["coordinates"][0] for f in feats], [f["geometry"]["coordinates"][1] for f in feats]), crs=4326)
    co = ne("ne_10m_admin_0_countries", None)[["NAME_EN", "geometry"]]
    pl = ne("ne_10m_populated_places_simple", None)[["name", "geometry"]]
    j = gpd.sjoin_nearest(pts.to_crs(3035), co.to_crs(3035), how="left", max_distance=30000).drop_duplicates("i").set_index("i")
    k = gpd.sjoin_nearest(pts.to_crs(3035), pl.to_crs(3035), how="left", distance_col="dkm").drop_duplicates("i").set_index("i")
    for i, f in enumerate(feats):
        cn = j.NAME_EN.get(i)
        if isinstance(cn, str): f["properties"]["co"] = cn
        if isinstance(k.name.get(i), str):
            f["properties"]["near"] = k.name.get(i); f["properties"]["nkm"] = round(float(k.dkm.get(i)) / 1000)
    by_c = pd.Series([f["properties"].get("co") for f in feats]).value_counts()
    cnt["by_country"] = {str(a): int(b) for a, b in by_c.items()}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "markets.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
    dated = [f["properties"] for f in feats if "o" in f["properties"]]
    by_open = {}
    for p in dated: by_open[p["o"]] = by_open.get(p["o"], 0) + 1
    peak = max(by_open.items(), key=lambda x: x[1])
    byc = cnt.pop("by_country")
    st = {"markets": len(feats), "status": cnt, "by_country": byc, "verified": [{"n": VERIFIED_NAME.get(i) or next(f["properties"]["n"] for f in feats if f["properties"]["id"] == i), "o": v[0], "c": v[1], "src": v[2]} for i, v in VERIFIED.items()], "past_years": dict(sorted(years.items())), "openings_by_day": dict(sorted(by_open.items())),
          "busiest_opening": peak, "source": "OpenStreetMap contributors (ODbL), Overpass export, xmas:feature=market"}
    (OUT / "stats.json").write_text(json.dumps(st, ensure_ascii=False, indent=1))
    print(json.dumps({k: st[k] for k in ("markets", "status", "past_years", "busiest_opening")}))


if __name__ == "__main__":
    main()
