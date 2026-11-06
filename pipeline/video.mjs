// ~14 s LinkedIn time-lapse (1080×1350): the 2026 season loads day by day, rendered from the live map code.
//   python -m http.server -d docs 8000 &  node pipeline/video.mjs   → media/day7_christmas_is_loading.mp4, media/cover.png, media/thumb.jpg
import { chromium } from "playwright";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const URL = process.env.URL || "http://localhost:8000/";
const OUT = "media", FR = "media/frames";
fs.mkdirSync(FR, { recursive: true });
for (const f of fs.readdirSync(FR)) fs.unlinkSync(`${FR}/${f}`);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

// hub thumbnail first, the page as it opens on 1 Dec
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof S !== "undefined" && S.map && S.map.getLayer("m-open"), null, { timeout: 60000 });
  await page.evaluate(() => { S.i = 30; render(); });
  await page.waitForFunction(() => S.map.loaded() && S.map.areTilesLoaded(), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/thumb_full.jpg`, type: "jpeg", quality: 88 });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForFunction(() => typeof S !== "undefined" && S.map && S.map.getLayer("m-open"), null, { timeout: 60000 });
await page.addStyleTag({ content: `
  .panel, .maplibregl-ctrl-top-right, .maplibregl-ctrl-bottom-right { display: none !important; }
  .v { position: absolute; z-index: 5; left: 44px; right: 44px; color: #efe9dc; font-family: Inter; }
  .v.top { top: 40px; }
  .v .eb { font-size: 20px; letter-spacing: .16em; text-transform: uppercase; color: #e9c77b; font-weight: 600; }
  .v h1 { font-family: Fraunces; font-weight: 800; font-size: 78px; line-height: .95; margin: 10px 0 0; }
  .v h1 span { color: #c4495a; }
  .v.bot { bottom: 44px; background: rgba(20,43,36,.9); border: 1px solid rgba(233,199,123,.35); border-radius: 16px; padding: 22px 26px; }
  .v .row { display: flex; justify-content: space-between; align-items: baseline; }
  .v .dt { font-family: Fraunces; font-size: 44px; font-weight: 600; color: #e9c77b; }
  .v .n { font-size: 26px; } .v .n b { font-size: 40px; }
  .v .load { height: 26px; border-radius: 13px; background: #0e211b; border: 1px solid rgba(239,233,220,.3); overflow: hidden; margin-top: 14px; position: relative; }
  .v .load i { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(-45deg, #c4495a 0 14px, #e8d9cf 14px 28px); }
  .v .foot { display: flex; justify-content: space-between; margin-top: 12px; font-size: 18px; color: #b9c7bd; }
  .v.out { inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(20,43,36,.0); }
  .card { background: rgba(20,43,36,.94); border: 1px solid rgba(233,199,123,.45); border-radius: 22px; padding: 40px 48px; text-align: center; width: 820px; }
  .card .big { font-family: Fraunces; font-size: 96px; font-weight: 800; color: #e9c77b; line-height: 1; }
  .card p { font-size: 28px; line-height: 1.35; margin: 14px 0 0; }
  .card .url { color: #e9c77b; font-weight: 600; font-size: 24px; margin-top: 26px; }
  .card .att { color: #8fa597; font-size: 16px; margin-top: 10px; }
` });
await page.evaluate(() => {
  document.body.insertAdjacentHTML("beforeend", `<div class="v top"><div class="eb">#30DayMapChallenge · Day 7 · Europe</div><h1>Christmas Is<br>Loading<span>…</span></h1></div>
    <div class="v bot"><div class="row"><span class="dt" id="vdt"></span><span class="n"><b id="vn"></b> markets open</span></div>
    <div class="load"><i id="vbar"></i></div><div class="foot"><span id="vpct"></span><span>OpenStreetMap · 1,265 markets</span></div></div>`);
  S.map.setPadding({ left: 0, top: 0, right: 0, bottom: 0 });
  S.map.jumpTo({ center: [11.2, 49.3], zoom: 4.55 });
});
await page.waitForFunction(() => S.map.loaded() && S.map.areTilesLoaded(), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(3000);

let n = 0;
const shot = async () => { await page.screenshot({ path: `${FR}/f${String(n).padStart(4, "0")}.png` }); n++; };
const setDay = async i => {
  await page.evaluate(i => {
    S.i = i; render();
    const d = new Date(Date.UTC(2026, 10, 1) + i * 864e5);
    document.querySelector("#vdt").textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
    document.querySelector("#vn").textContent = document.querySelector("#nOpen").textContent;
    document.querySelector("#vbar").style.width = document.querySelector("#bar").style.width;
    document.querySelector("#vpct").textContent = `${document.querySelector("#pct").textContent}`;
  }, i);
  await page.evaluate(() => new Promise(r => { S.map.once("idle", r); S.map.triggerRepaint(); setTimeout(r, 700); }));
};
const FPS = 24;
await setDay(0); for (let k = 0; k < 14; k++) await shot();                       // 0.6 s intro
for (let i = 1; i <= 66; i++) {                                                   // 1 Nov → 6 Jan, 3 frames a day ≈ 8.3 s
  await setDay(i);
  const hold = [28, 53].includes(i) ? 10 : 3;                                     // linger on 1st Advent and 24 Dec
  for (let k = 0; k < hold; k++) await shot();
}
// outro: back to the busiest day, summary card
await setDay(30);
const st = JSON.parse(fs.readFileSync("docs/data/stats.json", "utf8"));
const peak = await page.evaluate(() => S.max);
await page.evaluate(({ peak, st }) => {
  document.querySelector(".v.bot").style.display = "none";
  document.body.insertAdjacentHTML("beforeend", `<div class="v out"><div class="card"><div class="big">${peak}</div>
    <p>Christmas markets open on the same evening at the peak of the 2026 season, out of ${st.markets.toLocaleString("en-GB")} mapped in OpenStreetMap across Europe.</p>
    <div class="url">Interactive calendar · barisparlatangiller.github.io</div>
    <div class="att">Data © OpenStreetMap contributors (ODbL) · dates estimated where not yet published</div></div></div>`);
}, { peak, st });
await page.waitForTimeout(400);
for (let k = 0; k < 66; k++) await shot();                                        // 2.75 s
fs.copyFileSync(`${FR}/f${String(n - 1).padStart(4, "0")}.png`, `${OUT}/cover.png`);
await browser.close();
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${FR}/f%04d.png`, "-c:v", "libx264", "-preset", "veryfast",
  "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${OUT}/day7_christmas_is_loading.mp4`]);
console.log(`${n} frames, ${(n / FPS).toFixed(1)} s, ${(fs.statSync(`${OUT}/day7_christmas_is_loading.mp4`).size / 1e6).toFixed(2)} MB`);
fs.rmSync(FR, { recursive: true });
