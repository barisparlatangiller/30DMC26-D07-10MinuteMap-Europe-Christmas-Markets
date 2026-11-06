/* Christmas Is Loading… · #30DayMapChallenge 2026 Day 7 */
const START = new Date(Date.UTC(2026, 10, 1)), DAYS = 71;             // 1 Nov 2026 – 10 Jan 2027
const iso = i => new Date(START.getTime() + i * 864e5).toISOString().slice(0, 10);
const nice = s => new Date(s + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const $ = s => document.querySelector(s);
const S = { i: 5, play: null, feats: [], dated: [] };

// CARTO Dark Matter, re-inked in Christmas colours: pine land, red borders, gold and snow labels
function reink(st) {
  for (const l of st.layers) {
    const id = l.id, p = (l.paint = l.paint || {});
    if (l.type === "background") p["background-color"] = "#133326";
    else if (l.type === "fill") { p["fill-color"] = /water/.test(id) ? "#0a1d16" : /building/.test(id) ? "#173a2c" : /park|landcover|wood|grass/.test(id) ? "#163a2b" : "#133326"; delete p["fill-pattern"]; }
    else if (l.type === "line") {
      if (/boundary_country|boundary_2|country/.test(id)) { p["line-color"] = "#d4213d"; p["line-width"] = ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.2]; p["line-opacity"] = 0.85; }
      else if (/boundary/.test(id)) { p["line-color"] = "#c99a3a"; p["line-opacity"] = 0.45; }
      else if (/water/.test(id)) p["line-color"] = "#0a1d16";
      else p["line-color"] = "#1c4635";
    } else if (l.type === "symbol") {
      p["text-color"] = /place_country|country/.test(id) ? "#f5c451" : /place_(city|capital)|city/.test(id) ? "#f6f1e7" : /water/.test(id) ? "#5f8a77" : "#a9bcb0";
      p["text-halo-color"] = "#0d241b"; p["text-halo-width"] = 1.4;
      if (/poi|housenumber/.test(id)) l.layout = { ...(l.layout || {}), visibility: "none" };
    }
  }
  return st;
}

async function init() {
  const [style, fc, stats] = await Promise.all([
    fetch("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json").then(r => r.json()),
    fetch("data/markets.geojson?v=1").then(r => r.json()), fetch("data/stats.json?v=1").then(r => r.json())]);
  S.feats = fc.features; S.dated = fc.features.filter(f => f.properties.o);
  $("#nAll").textContent = stats.markets.toLocaleString("en-GB");
  const map = (S.map = new maplibregl.Map({ container: "map", style: reink(style), center: [12, 50.5], zoom: 4.1, minZoom: 2.5, maxZoom: 17, attributionControl: false }));
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Markets © OpenStreetMap contributors" }), "bottom-right");
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  const setup = () => {
    if (map.getSource("m")) return;
    map.addSource("m", { type: "geojson", data: fc });
    const open = ["all", ["has", "o"], ["<=", ["get", "o"], ["literal", iso(S.i)]], [">=", ["get", "c"], ["literal", iso(S.i)]]];
    map.addLayer({ id: "m-dim", type: "circle", source: "m", paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 10, 5], "circle-color": ["match", ["get", "s"], "unknown", "#f6f1e7", "past", "#d4213d", "#f5c451"],
      "circle-opacity": ["match", ["get", "s"], "unknown", 0.28, 0.45] } });
    map.addLayer({ id: "m-glow", type: "circle", source: "m", filter: open, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9, 10, 26], "circle-color": ["match", ["get", "s"], "past", "#d4213d", "#f5c451"],
      "circle-opacity": 0.22, "circle-blur": 1 } });
    map.addLayer({ id: "m-open", type: "circle", source: "m", filter: open, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3.4, 10, 9], "circle-color": ["match", ["get", "s"], "past", "#d4213d", "#f5c451"],
      "circle-opacity": ["match", ["get", "s"], "recurring", 0.8, 1], "circle-stroke-color": "#f6f1e7", "circle-stroke-width": ["match", ["get", "s"], "2026", 1.4, 0.6] } });
    S.open = open; render();
    for (const id of ["m-open", "m-dim"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      map.on("click", id, e => popup(e.features[0], e.lngLat));
    }
  };
  map.on("load", setup);
  const poll = setInterval(() => { if (map.style && map.style._loaded) { setup(); clearInterval(poll); } }, 200);

  const today = Math.round((Date.UTC(2026, 10, 6) - START) / 864e5);
  S.i = today; $("#day").value = today; $("#day").max = DAYS - 1;
  $("#day").oninput = e => { S.i = +e.target.value; render(); };
  $("#play").onclick = () => {
    if (S.play) { clearInterval(S.play); S.play = null; $("#play").textContent = "▶"; return; }
    if (S.i >= DAYS - 1) S.i = 0;
    $("#play").textContent = "❚❚";
    S.play = setInterval(() => { S.i++; if (S.i >= DAYS - 1) { clearInterval(S.play); S.play = null; $("#play").textContent = "▶"; } $("#day").value = S.i; render(); }, 220);
  };
  new ResizeObserver(drawHist).observe($("#hist"));
  render();
}

function openOn(i) { const d = iso(i); return S.dated.filter(f => f.properties.o <= d && f.properties.c >= d).length; }
function render() {
  const d = iso(S.i), n = openOn(S.i), max = S.max || (S.max = Math.max(...Array.from({ length: DAYS }, (_, k) => openOn(k))));
  $("#dlabel").textContent = nice(d);
  $("#nOpen").textContent = n.toLocaleString("en-GB");
  $("#bar").style.width = `${(100 * n / max).toFixed(1)}%`;
  $("#pct").textContent = `${Math.round(100 * n / max)}% of the season's peak`;
  if (S.map && S.map.getLayer("m-open")) {
    const f = ["all", ["has", "o"], ["<=", ["get", "o"], d], [">=", ["get", "c"], d]];
    S.map.setFilter("m-open", f); S.map.setFilter("m-glow", f);
  }
  drawHist();
}
function drawHist() {
  const cv = $("#hist"), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (!S.dated.length || !r.width) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext("2d"), vals = Array.from({ length: DAYS }, (_, k) => openOn(k)), mx = Math.max(...vals), w = cv.width / DAYS;
  g.clearRect(0, 0, cv.width, cv.height);
  vals.forEach((v, k) => {
    const h = (cv.height - 12 * dpr) * v / mx;
    g.fillStyle = k === S.i ? "#f5c451" : k < S.i ? "rgba(212,33,61,.85)" : "rgba(246,241,231,.22)";
    g.fillRect(k * w + 0.5, cv.height - 12 * dpr - h, Math.max(1, w - 1), h);
  });
  g.fillStyle = "#b9c7bd"; g.font = `${9.5 * dpr}px Inter`; g.textBaseline = "bottom";
  [["1 Nov", 0], ["1 Dec", 30], ["24 Dec", 53], ["1 Jan", 61]].forEach(([t, k]) => g.fillText(t, k * w, cv.height));
}

function popup(f, ll) {
  const p = f.properties;
  const when = p.o ? `${nice(p.o).replace(/ 202\d/, "")} – ${nice(p.c)}` : "No date in OSM";
  const why = { "2026": "Dates tagged for 2026 in OSM.", recurring: "Yearly dates tagged without a year, applied to 2026.",
    past: `Dates tagged for ${p.y}; shown on the same calendar days in 2026 as an estimate.`, unknown: "OSM has no usable date for this market." }[p.s];
  new maplibregl.Popup({ offset: 8 }).setLngLat(ll).setHTML(`<div class="pp"><h3>${esc(p.n)}</h3><div class="d">${esc(when)}</div>
    ${p.h ? `<div>${esc(p.h)}</div>` : ""}${p.loc ? `<div>${esc(p.loc)}</div>` : ""}
    <div class="s">${why}${p.raw ? ` OSM: “${esc(p.raw)}”` : ""}</div>
    <div class="s">${p.u ? `<a href="${esc(p.u)}" target="_blank" rel="noopener">website</a> · ` : ""}${p.id ? `<a href="https://www.openstreetmap.org/${esc(p.id)}" target="_blank" rel="noopener">OSM</a>` : ""}</div></div>`).addTo(S.map);
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
init();
