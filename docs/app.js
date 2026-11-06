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
    if (l.type === "background") p["background-color"] = "#18342b";
    else if (l.type === "fill") { p["fill-color"] = /water/.test(id) ? "#10251e" : /building/.test(id) ? "#1b3a30" : /park|landcover|wood|grass/.test(id) ? "#1a3a2f" : "#18342b"; delete p["fill-pattern"]; }
    else if (l.type === "line") {
      if (/boundary_country|boundary_2|country/.test(id)) { p["line-color"] = "#c4495a"; p["line-width"] = ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.2]; p["line-opacity"] = 0.85; }
      else if (/boundary/.test(id)) { p["line-color"] = "#b99a5e"; p["line-opacity"] = 0.45; }
      else if (/water/.test(id)) p["line-color"] = "#10251e";
      else p["line-color"] = "#23463a";
    } else if (l.type === "symbol") {
      p["text-color"] = /place_country|country/.test(id) ? "#e9c77b" : /place_(city|capital)|city/.test(id) ? "#efe9dc" : /water/.test(id) ? "#5f8a77" : "#a9bcb0";
      p["text-halo-color"] = "#0d241b"; p["text-halo-width"] = 1.4;
      if (/poi|housenumber/.test(id)) l.layout = { ...(l.layout || {}), visibility: "none" };
    }
  }
  return st;
}

async function init() {
  const [style, fc, stats] = await Promise.all([
    fetch("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json").then(r => r.json()),
    fetch("data/markets.geojson?v=2").then(r => r.json()), fetch("data/stats.json?v=2").then(r => r.json())]);
  S.feats = fc.features; S.dated = fc.features.filter(f => f.properties.o);
  $("#nAll").textContent = stats.markets.toLocaleString("en-GB");
  $("#nVer").textContent = stats.status.verified;
  $("#topc").textContent = Object.entries(stats.by_country).slice(0, 5).map(([c, n]) => `${c} ${n}`).join(" · ");
  const map = (S.map = new maplibregl.Map({ container: "map", style: reink(style), center: [12, 50.5], zoom: 4.1, minZoom: 2.5, maxZoom: 17, attributionControl: false }));
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Markets © OpenStreetMap contributors" }), "bottom-right");
  if (innerWidth > 700) map.setPadding({ left: 400, top: 0, right: 0, bottom: 0 });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  const setup = () => {
    if (map.getLayer("m-open")) return true;
    try {
    if (!map.getSource("m")) map.addSource("m", { type: "geojson", data: fc });
    const open = ["all", ["has", "o"], ["<=", ["get", "o"], ["literal", iso(S.i)]], [">=", ["get", "c"], ["literal", iso(S.i)]]];
    if (!map.getLayer("m-dim")) map.addLayer({ id: "m-dim", type: "circle", source: "m", paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 10, 5], "circle-color": ["match", ["get", "s"], "unknown", "#efe9dc", "past", "#c4495a", "verified", "#ffe4a3", "#e9c77b"],
      "circle-opacity": ["match", ["get", "s"], "unknown", 0.28, 0.45] } });
    if (!map.getLayer("m-glow")) map.addLayer({ id: "m-glow", type: "circle", source: "m", filter: open, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9, 10, 26], "circle-color": ["match", ["get", "s"], "past", "#c4495a", "#e9c77b"],
      "circle-opacity": 0.16, "circle-blur": 1 } });
    map.addLayer({ id: "m-open", type: "circle", source: "m", filter: open, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["match", ["get", "s"], "verified", 6, 3.4], 10, ["match", ["get", "s"], "verified", 13, 9]], "circle-color": ["match", ["get", "s"], "past", "#c4495a", "verified", "#ffe4a3", "#e9c77b"],
      "circle-opacity": ["match", ["get", "s"], "recurring", 0.8, 1], "circle-stroke-color": "#efe9dc", "circle-stroke-width": ["match", ["get", "s"], "verified", 2.2, "2026", 1.4, 0.6] } });
    map.addLayer({ id: "m-vlabel", type: "symbol", source: "m", filter: ["==", ["get", "s"], "verified"], minzoom: 4.6,
      layout: { "text-field": ["get", "n"], "text-font": ["Montserrat Medium", "Open Sans Regular"], "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-max-width": 9 },
      paint: { "text-color": "#ffe4a3", "text-halo-color": "#142b24", "text-halo-width": 1.4 } });
    S.open = open; render();
    for (const id of ["m-open", "m-dim"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      map.on("click", id, e => popup(e.features[0], e.lngLat));
    }
    return true;
    } catch (e) { console.warn("setup retry", e.message); return false; }
  };
  map.on("load", setup);
  const poll = setInterval(() => { if (map.style && map.style._loaded && setup()) clearInterval(poll); }, 250);

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
  drawHist(); openList(d);
}
const RANK = { verified: 0, "2026": 1, recurring: 2, past: 3 };
function openList(d) {
  const L = S.dated.filter(f => f.properties.o <= d && f.properties.c >= d)
    .sort((a, b) => RANK[a.properties.s] - RANK[b.properties.s] || (a.properties.o < b.properties.o ? -1 : 1));
  const el = $("#list"); if (!el) return;
  el.innerHTML = L.length ? L.slice(0, 40).map(f => { const p = f.properties; return `<li data-id="${esc(p.id)}"><i class="dot ${p.s}"></i><span>${esc(p.n)}</span><small>${esc(p.near && p.nkm < 30 ? p.near : p.co || "")}</small></li>`; }).join("")
    + (L.length > 40 ? `<li class="more">+ ${L.length - 40} more on the map</li>` : "") : `<li class="more">No market open yet. Press play.</li>`;
  el.querySelectorAll("li[data-id]").forEach(li => li.onclick = () => {
    const f = S.feats.find(x => x.properties.id === li.dataset.id); if (!f) return;
    S.map.flyTo({ center: f.geometry.coordinates, zoom: 12, speed: 1.4 }); popup(f, { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
  });
}
function drawHist() {
  const cv = $("#hist"), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (!S.dated.length || !r.width) return;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext("2d"), vals = Array.from({ length: DAYS }, (_, k) => openOn(k)), mx = Math.max(...vals), w = cv.width / DAYS;
  g.clearRect(0, 0, cv.width, cv.height);
  vals.forEach((v, k) => {
    const h = (cv.height - 12 * dpr) * v / mx;
    g.fillStyle = k === S.i ? "#e9c77b" : k < S.i ? "rgba(196,73,90,.75)" : "rgba(246,241,231,.22)";
    g.fillRect(k * w + 0.5, cv.height - 12 * dpr - h, Math.max(1, w - 1), h);
  });
  g.fillStyle = "#b9c7bd"; g.font = `${9.5 * dpr}px Inter`; g.textBaseline = "bottom";
  [["1 Nov", 0], ["1st Advent", 28], ["24 Dec", 53], ["1 Jan", 61]].forEach(([t, k]) => g.fillText(t, k * w, cv.height));
  g.strokeStyle = "rgba(233,199,123,.6)"; g.setLineDash([2 * dpr, 2 * dpr]);
  for (const k of [28, 53]) { g.beginPath(); g.moveTo(k * w + w / 2, 0); g.lineTo(k * w + w / 2, cv.height - 12 * dpr); g.stroke(); }
  g.setLineDash([]);
}

function popup(f, ll) {
  const p = f.properties;
  const when = p.o ? `${nice(p.o).replace(/ 202\d/, "")} – ${nice(p.c)}` : "No date in OSM";
  const where = [p.near && p.nkm < 30 ? (p.nkm <= 3 ? p.near : `near ${p.near}`) : null, p.co].filter(Boolean).join(", ");
  const why = { verified: `2026 dates checked with the organiser or city. <a href="${esc(p.src)}" target="_blank" rel="noopener">source</a>`, "2026": "Dates tagged for 2026 in OSM.", recurring: "Yearly dates tagged without a year, applied to 2026.",
    past: `Dates tagged for ${p.y}; moved to the same weekday in 2026 as an estimate.`, unknown: "OSM has no usable date for this market." }[p.s];
  new maplibregl.Popup({ offset: 8 }).setLngLat(ll).setHTML(`<div class="pp"><h3>${esc(p.n)}</h3>${where ? `<div class="w">${esc(where)}</div>` : ""}<div class="d">${esc(when)}</div>
    ${p.h ? `<div>${esc(p.h)}</div>` : ""}${p.loc ? `<div>${esc(p.loc)}</div>` : ""}
    <div class="s">${why}${p.raw && p.s !== "verified" ? ` OSM: “${esc(p.raw)}”` : ""}</div>
    <div class="s">${p.u ? `<a href="${esc(p.u)}" target="_blank" rel="noopener">website</a> · ` : ""}${p.id ? `<a href="https://www.openstreetmap.org/${esc(p.id)}" target="_blank" rel="noopener">OSM</a>` : ""}</div></div>`).addTo(S.map);
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
init();
